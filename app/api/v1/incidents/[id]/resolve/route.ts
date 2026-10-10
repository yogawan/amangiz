import { forbidden, notFound, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notify } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  INCIDENT_TRANSITIONS,
  resolveIncidentSchema,
} from "@/lib/validations/incident";
import { assertTransition } from "@/lib/workflow";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";

/**
 * Records the resolution of a case (PRD 8.10).
 *
 * Resolving while an investigation is still open is refused: PRD 8.12 notes
 * that completing an investigation and closing an incident are related but not
 * identical, and the ordering has to be explicit rather than implied.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "investigator") {
    throw forbidden("Resolving an incident requires investigator or admin");
  }

  const id = await routeObjectId(params);
  const { resolutionSummary } = resolveIncidentSchema.parse(
    await readJson(request),
  );

  const incident = await Incident.findById(id).exec();
  if (!incident) throw notFound("Incident not found");

  // Only the assigned investigator (or an admin) may resolve (PRD 3.3 #6).
  if (
    !isAdmin(actor) &&
    incident.assignedInvestigatorId &&
    !incident.assignedInvestigatorId.equals(actor.id)
  ) {
    throw forbidden("You are not the assigned investigator for this incident");
  }

  assertTransition(
    "Incident status",
    incident.status,
    "resolved",
    INCIDENT_TRANSITIONS,
  );

  const investigation = await Investigation.findOne({ incidentId: id })
    .select("status")
    .lean()
    .exec();

  if (investigation && investigation.status !== "completed") {
    throw unprocessable(
      `The investigation for this incident is still "${investigation.status}". Complete it before resolving the incident.`,
    );
  }

  const previousStatus = incident.status;
  incident.status = "resolved";
  incident.resolutionSummary = resolutionSummary;
  incident.resolvedAt = new Date();
  await incident.save();

  await recordAudit({
    actorId: actor.id,
    action: "incident.resolve",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    changes: [{ field: "status", before: previousStatus, after: "resolved" }],
    metadata: { resolutionSummary },
  });

  await notify({
    recipientId: incident.reportedBy,
    type: "investigation_updated",
    title: `Incident ${incident.incidentCode} resolved`,
    message: resolutionSummary,
    resourceType: "incident",
    resourceId: incident._id,
  });

  return ok({
    id: incident._id,
    status: incident.status,
    resolvedAt: incident.resolvedAt,
  });
});
