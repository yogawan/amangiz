import { forbidden, notFound } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  INCIDENT_TRANSITIONS,
  triageIncidentSchema,
} from "@/lib/validations/incident";
import { assertTransition } from "@/lib/workflow";
import Incident from "@/models/Incident";

/**
 * Initial triage (PRD 8.10).
 *
 * This is where `Incident.severity` is set, and it is a human judgement. The
 * risk engine never writes this field — its output lives in RiskAssessment so
 * the two stay distinguishable (PRD 6.4 #3, #4).
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "investigator") {
    throw forbidden("Triage requires investigator or admin");
  }

  const id = await routeObjectId(params);
  const { severity, note } = triageIncidentSchema.parse(
    await readJson(request),
  );

  const incident = await Incident.findById(id).exec();
  if (!incident) throw notFound("Incident not found");

  // Re-triaging an already-triaged case is allowed (severity can be revised),
  // but moving the status is only valid from "reported".
  if (incident.status === "reported") {
    assertTransition(
      "Incident status",
      incident.status,
      "triaged",
      INCIDENT_TRANSITIONS,
    );
    incident.status = "triaged";
  }

  const previousSeverity = incident.severity;
  incident.severity = severity;
  await incident.save();

  await recordAudit({
    actorId: actor.id,
    action: "incident.triage",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    changes: [{ field: "severity", before: previousSeverity, after: severity }],
    metadata: { note, assessedBy: "human_triage" },
  });

  return ok({
    id: incident._id,
    status: incident.status,
    severity: incident.severity,
  });
});
