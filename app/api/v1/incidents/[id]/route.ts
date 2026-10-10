import { loadIncidentForRead, loadIncidentForWrite } from "@/lib/access";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { updateIncidentSchema } from "@/lib/validations/incident";
import type { IAuditLogChange } from "@/models/AuditLog";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";
import RiskAssessment from "@/models/RiskAssessment";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  await loadIncidentForRead(user, id);

  // The three layers are returned separately on purpose: the initial report,
  // the rule-based assessment, and the investigation findings must stay
  // visually and structurally distinguishable (PRD 6.4 #4, 9.2 #7).
  const [incident, latestRiskAssessment, investigation] = await Promise.all([
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

  return ok({
    report: incident,
    latestRiskAssessment,
    investigation,
  });
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = updateIncidentSchema.parse(await readJson(request));

  const incident = await loadIncidentForWrite(actor, id);
  const changes: IAuditLogChange[] = [];

  for (const field of ["title", "description", "incidentType"] as const) {
    const next = input[field];
    if (next !== undefined && next !== incident[field]) {
      changes.push({ field, before: incident[field], after: next });
      incident.set(field, next);
    }
  }

  if (input.reportedAffectedCount !== undefined) {
    changes.push({
      field: "reportedAffectedCount",
      before: incident.reportedAffectedCount,
      after: input.reportedAffectedCount,
    });
    incident.reportedAffectedCount = input.reportedAffectedCount;
  }
  if (input.occurredAt !== undefined) {
    incident.occurredAt = new Date(input.occurredAt);
  }
  if (input.symptomsReported !== undefined) {
    incident.symptomsReported = input.symptomsReported;
  }
  if (input.batchId !== undefined) {
    incident.batchId = toObjectId(input.batchId);
    changes.push({ field: "batchId", after: input.batchId });
  }
  if (input.distributionId !== undefined) {
    incident.distributionId = toObjectId(input.distributionId);
    changes.push({ field: "distributionId", after: input.distributionId });
  }

  await incident.save();

  await recordAudit({
    actorId: actor.id,
    action: "incident.update",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    changes,
  });

  return ok(incident);
});
