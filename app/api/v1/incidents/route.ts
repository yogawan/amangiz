import { unprocessable } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notifyRoles } from "@/lib/notifications";
import { incidentScope } from "@/lib/permissions";
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
  createIncidentSchema,
  incidentListQuerySchema,
} from "@/lib/validations/incident";
import Distribution from "@/models/Distribution";
import FoodBatch from "@/models/FoodBatch";
import Incident from "@/models/Incident";

const SORTABLE = [
  "incidentCode",
  "reportedAt",
  "occurredAt",
  "severity",
  "status",
  "reportedAffectedCount",
] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  const query = parseQuery(request, incidentListQuerySchema);

  const filter = mergeFilters(
    incidentScope(user),
    searchFilter(query.search, ["incidentCode", "title", "description"]),
    query.status ? { status: query.status } : {},
    query.severity ? { severity: query.severity } : {},
    query.incidentType ? { incidentType: query.incidentType } : {},
    query.batchId ? { batchId: toObjectId(query.batchId) } : {},
    query.schoolId ? { schoolId: toObjectId(query.schoolId) } : {},
    query.sppgId ? { sppgId: toObjectId(query.sppgId) } : {},
    query.assignedInvestigatorId
      ? { assignedInvestigatorId: toObjectId(query.assignedInvestigatorId) }
      : {},
    dateRangeFilter("reportedAt", query.from, query.to),
  );

  const [items, total] = await Promise.all([
    Incident.find(filter)
      .populate("batchId", "batchCode menuName status")
      .populate("schoolId", "code name")
      .populate("reportedBy", "name role")
      .populate("assignedInvestigatorId", "name email")
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "reportedAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Incident.countDocuments(filter).exec(),
  ]);

  return paginated(items, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  const input = createIncidentSchema.parse(await readJson(request));

  const batchId = input.batchId ? toObjectId(input.batchId) : undefined;
  const distributionId = input.distributionId
    ? toObjectId(input.distributionId)
    : undefined;

  // sppgId and schoolId are derived from the linked records where possible so
  // the scoping fields always agree with the actual relationships.
  let sppgId: typeof batchId;
  let schoolId = input.schoolId ? toObjectId(input.schoolId) : undefined;

  if (distributionId) {
    const distribution = await Distribution.findById(distributionId)
      .select("sppgId schoolId batchId")
      .lean()
      .exec();
    if (!distribution) {
      throw unprocessable("No distribution found for the given distributionId");
    }
    sppgId = distribution.sppgId;
    schoolId = distribution.schoolId;

    if (batchId && !distribution.batchId.equals(batchId)) {
      throw unprocessable(
        "The given batchId does not match the batch on that distribution",
      );
    }
  } else if (batchId) {
    const batch = await FoodBatch.findById(batchId)
      .select("sppgId")
      .lean()
      .exec();
    if (!batch) throw unprocessable("No batch found for the given batchId");
    sppgId = batch.sppgId;
  }

  // A school operator always reports on behalf of their own school.
  if (actor.role === "school_operator" && actor.organizationId) {
    schoolId = actor.organizationId;
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : undefined;
  if (occurredAt && occurredAt.getTime() > Date.now() + 60_000) {
    throw unprocessable("occurredAt cannot be in the future");
  }

  const incident = await withUniqueCode(CodePrefix.incident, (incidentCode) =>
    Incident.create({
      incidentCode,
      title: input.title,
      description: input.description,
      incidentType: input.incidentType,
      reportedBy: actor.id,
      batchId,
      distributionId,
      sppgId,
      schoolId,
      occurredAt,
      reportedAt: new Date(),
      reportedAffectedCount: input.reportedAffectedCount,
      symptomsReported: input.symptomsReported,
      evidence: [],
      // Severity stays "unassessed" until a human triages it. The report itself
      // never sets its own priority (PRD 7.9).
      severity: "unassessed",
      status: "reported",
    }),
  );

  await recordAudit({
    actorId: actor.id,
    action: "incident.report",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: sppgId ?? schoolId,
    metadata: {
      incidentCode: incident.incidentCode,
      incidentType: incident.incidentType,
    },
  });

  await notifyRoles(["admin", "investigator"], {
    type: "incident_reported",
    title: `New incident ${incident.incidentCode}`,
    message: incident.title,
    resourceType: "incident",
    resourceId: incident._id,
  });

  return created(incident);
});
