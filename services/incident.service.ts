import type { Types } from "mongoose";
import type { z } from "zod";
import { loadIncidentForRead } from "@/lib/access";
import type { AuthUser } from "@/lib/auth/guard";
import { incidentScope } from "@/lib/permissions";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  searchFilter,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import type { incidentListQuerySchema } from "@/lib/validations/incident";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";
import RiskAssessment from "@/models/RiskAssessment";

/**
 * Read queries for `/app/incidents` (PRD 8.10), extracted from
 * app/api/v1/incidents/**\/route.ts GET handlers (UI_PLAN.md §0
 * no-logic-drift rule).
 */

type IncidentListQuery = z.infer<typeof incidentListQuerySchema>;

const LIST_SORTABLE = [
  "incidentCode",
  "reportedAt",
  "occurredAt",
  "severity",
  "status",
  "reportedAffectedCount",
] as const;

export async function listIncidents(actor: AuthUser, query: IncidentListQuery) {
  const filter = mergeFilters(
    incidentScope(actor),
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

  const [data, total] = await Promise.all([
    Incident.find(filter)
      .populate("batchId", "batchCode menuName status")
      .populate("schoolId", "code name")
      .populate("reportedBy", "name role")
      .populate("assignedInvestigatorId", "name email")
      .sort(
        buildSort(query.sortBy, query.sortOrder, LIST_SORTABLE, "reportedAt"),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Incident.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

/**
 * Detail read for `/app/incidents/[id]`. Returns the three layers separately
 * on purpose — initial report, rule-based assessment, investigation summary —
 * so the UI can never blend the risk engine's score with a human's severity
 * triage (PRD §6.4 #4, §9.2 #7).
 */
export async function getIncidentById(actor: AuthUser, id: Types.ObjectId) {
  await loadIncidentForRead(actor, id);

  const [report, latestRiskAssessment, investigation] = await Promise.all([
    Incident.findById(id)
      .populate("batchId", "batchCode menuName productionDate status")
      .populate(
        "distributionId",
        "distributionCode status dispatchedAt receivedAt",
      )
      .populate("schoolId", "code name level")
      .populate("sppgId", "code name")
      .populate("reportedBy", "name role email")
      .populate("assignedInvestigatorId", "name email")
      .lean()
      .exec(),
    RiskAssessment.findOne({ incidentId: id })
      .sort({ assessedAt: -1 })
      .populate("assessedBy", "name role")
      .lean()
      .exec(),
    Investigation.findOne({ incidentId: id })
      .select("status assignedTo rootCauseStatus completedAt")
      .populate("assignedTo", "name email")
      .lean()
      .exec(),
  ]);

  return { report, latestRiskAssessment, investigation };
}
