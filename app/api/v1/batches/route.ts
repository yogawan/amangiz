import { forbidden, unprocessable } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireOrganization, requireUser } from "@/lib/auth/guard";
import { batchScopeAsync, isAdmin } from "@/lib/permissions";
import { CodePrefix, withUniqueCode } from "@/lib/utils/code";
import {
  batchListQuerySchema,
  createBatchSchema,
} from "@/lib/validations/batch";
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
import FoodBatch from "@/models/FoodBatch";
import SPPG from "@/models/SPPG";
import Supplier from "@/models/Supplier";

const SORTABLE = [
  "batchCode",
  "menuName",
  "productionDate",
  "status",
  "createdAt",
] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, batchListQuerySchema);

  const filter = mergeFilters(
    await batchScopeAsync(user),
    searchFilter(query.search, ["batchCode", "menuName"]),
    query.status ? { status: query.status } : {},
    query.sppgId ? { sppgId: toObjectId(query.sppgId) } : {},
    query.menuName
      ? { menuName: { $regex: query.menuName, $options: "i" } }
      : {},
    dateRangeFilter("productionDate", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    FoodBatch.find(filter)
      .populate("sppgId", "code name")
      .sort(
        buildSort(query.sortBy, query.sortOrder, SORTABLE, "productionDate"),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    FoodBatch.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "sppg_operator") {
    throw forbidden("Creating a batch requires admin or SPPG operator");
  }

  const input = createBatchSchema.parse(await readJson(request));

  // An SPPG operator always produces for their own SPPG; an admin must say which.
  let sppgId =
    actor.role === "sppg_operator" ? requireOrganization(actor) : null;
  if (!sppgId) {
    if (!input.sppgId) {
      throw unprocessable("sppgId is required when creating a batch as admin");
    }
    sppgId = toObjectId(input.sppgId);
    const sppgExists = await SPPG.exists({ _id: sppgId }).exec();
    if (!sppgExists) throw unprocessable("No SPPG found for the given sppgId");
  }

  // Every ingredient must point at a real supplier, otherwise the trace from
  // batch back to supplier silently breaks later.
  if (input.ingredients.length > 0) {
    const supplierIds = [
      ...new Set(input.ingredients.map((item) => item.supplierId)),
    ];
    const found = await Supplier.countDocuments({
      _id: { $in: supplierIds.map(toObjectId) },
    }).exec();
    if (found !== supplierIds.length) {
      throw unprocessable(
        "One or more ingredient supplierId values are unknown",
      );
    }
  }

  const batch = await withUniqueCode(CodePrefix.batch, (batchCode) =>
    FoodBatch.create({
      batchCode,
      sppgId,
      menuName: input.menuName,
      productionDate: new Date(input.productionDate),
      expiryAt: input.expiryAt ? new Date(input.expiryAt) : undefined,
      ingredients: input.ingredients.map((item) => ({
        ...item,
        supplierId: toObjectId(item.supplierId),
      })),
      storageTemperature: input.storageTemperature?.map((reading) => ({
        ...reading,
        recordedAt: new Date(reading.recordedAt),
      })),
      productionNotes: input.productionNotes,
      status: "draft",
      createdBy: actor.id,
    }),
  );

  await recordAudit({
    actorId: actor.id,
    action: "batch.create",
    resourceType: "FoodBatch",
    resourceId: batch._id,
    organizationId: batch.sppgId,
    metadata: { batchCode: batch.batchCode, menuName: batch.menuName },
  });

  return created(batch);
});
