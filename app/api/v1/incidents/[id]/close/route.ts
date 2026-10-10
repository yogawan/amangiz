import { forbidden, notFound } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  closeIncidentSchema,
  INCIDENT_TRANSITIONS,
} from "@/lib/validations/incident";
import { assertTransition } from "@/lib/workflow";
import Incident from "@/models/Incident";

/**
 * Closes a case (PRD 8.10).
 *
 * The transition table only allows `resolved → closed`, which enforces the
 * PRD's requirement that a case cannot be closed just because a report exists
 * or an early action was taken.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "investigator") {
    throw forbidden("Closing an incident requires investigator or admin");
  }

  const id = await routeObjectId(params);
  const { note } = closeIncidentSchema.parse(await readJson(request));

  const incident = await Incident.findById(id).exec();
  if (!incident) throw notFound("Incident not found");

  assertTransition(
    "Incident status",
    incident.status,
    "closed",
    INCIDENT_TRANSITIONS,
  );

  const previousStatus = incident.status;
  incident.status = "closed";
  incident.closedAt = new Date();
  await incident.save();

  await recordAudit({
    actorId: actor.id,
    action: "incident.close",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    changes: [{ field: "status", before: previousStatus, after: "closed" }],
    metadata: { note },
  });

  return ok({
    id: incident._id,
    status: incident.status,
    closedAt: incident.closedAt,
  });
});
