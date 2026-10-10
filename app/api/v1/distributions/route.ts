import { forbidden, unprocessable } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireOrganization, requireUser } from "@/lib/auth/guard";
import { distributionScope, isAdmin } from "@/lib/permissions";
import { CodePrefix, withUniqueCode } from "@/lib/utils/code";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  parseQuery,
  searchFilter,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import {
  createDistributionSchema,
  distributionListQuerySchema,
} from "@/lib/validations/distribution";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import School from "@/models/School";

const SORTABLE = [
  "distributionCode",
  "scheduledAt",
  "dispatchedAt",
  "receivedAt",
  "status",
  "createdAt",
] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, distributionListQuerySchema);

  const filter = mergeFilters(
    distributionScope(user),
    searchFilter(query.search, ["distributionCode"]),
    query.status ? { status: query.status } : {},
    query.batchId ? { batchId: toObjectId(query.batchId) } : {},
    query.schoolId ? { schoolId: toObjectId(query.schoolId) } : {},
    query.sppgId ? { sppgId: toObjectId(query.sppgId) } : {},
    dateRangeFilter("scheduledAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    Distribution.find(filter)
      .populate("batchId", "batchCode menuName status")
      .populate("schoolId", "code name level")
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "scheduledAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Distribution.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "sppg_operator") {
    throw forbidden("Creating a distribution requires admin or SPPG operator");
  }

  const input = createDistributionSchema.parse(await readJson(request));
  const batchId = toObjectId(input.batchId);
  const schoolId = toObjectId(input.schoolId);

  const [batch, school] = await Promise.all([
    FoodBatch.findById(batchId).select("sppgId status batchCode").lean().exec(),
    School.findById(schoolId).select("status name").lean().exec(),
  ]);

  if (!batch) throw unprocessable("No batch found for the given batchId");
  if (!school) throw unprocessable("No school found for the given schoolId");

  // The SPPG is derived from the batch rather than taken from the client, so a
  // distribution can never claim a different producer than the batch has.
  if (
    actor.role === "sppg_operator" &&
    !batch.sppgId.equals(requireOrganization(actor))
  ) {
    throw forbidden("You cannot distribute a batch from another SPPG");
  }

  // Shipping food that is held or recalled is exactly what containment exists
  // to prevent (PRD 2.2 step 4).
  if (batch.status === "on_hold" || batch.status === "recalled") {
    throw unprocessable(
      `Batch ${batch.batchCode} is "${batch.status}" and cannot be distributed`,
    );
  }
  if (batch.status === "draft") {
    throw unprocessable(
      `Batch ${batch.batchCode} is still a draft and is not ready for distribution`,
    );
  }
  if (school.status !== "active") {
    throw unprocessable(`School "${school.name}" is not active`);
  }

  const distribution = await withUniqueCode(
    CodePrefix.distribution,
    (distributionCode) =>
      Distribution.create({
        distributionCode,
        batchId,
        sppgId: batch.sppgId,
        schoolId,
        quantity: input.quantity,
        unit: input.unit,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : undefined,
        notes: input.notes,
        status: "planned",
        createdBy: actor.id,
      }),
  );

  await recordAudit({
    actorId: actor.id,
    action: "distribution.create",
    resourceType: "Distribution",
    resourceId: distribution._id,
    organizationId: batch.sppgId,
    metadata: {
      distributionCode: distribution.distributionCode,
      batchCode: batch.batchCode,
    },
  });

  return created(distribution);
});
