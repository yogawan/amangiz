import { forbidden, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notify } from "@/lib/notifications";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { assignIncidentSchema } from "@/lib/validations/incident";
import Incident from "@/models/Incident";
import Investigation from "@/models/Investigation";
import User from "@/models/User";

/**
 * Assigns an investigator (PRD 8.10) and opens the matching investigation
 * record if one does not exist yet, so the case has somewhere to be documented.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "investigator") {
    throw forbidden("Assigning an investigator requires admin or investigator");
  }

  const id = await routeObjectId(params);
  const { investigatorId, note } = assignIncidentSchema.parse(
    await readJson(request),
  );
  const assigneeId = toObjectId(investigatorId);

  const incident = await Incident.findById(id).exec();
  if (!incident) throw unprocessable("Incident not found");
  if (incident.status === "closed") {
    throw unprocessable("A closed incident cannot be reassigned");
  }

  const assignee = await User.findById(assigneeId)
    .select("role isActive name")
    .lean()
    .exec();
  if (!assignee)
    throw unprocessable("No user found for the given investigatorId");
  if (!assignee.isActive) {
    throw unprocessable("Cannot assign a deactivated account");
  }
  if (assignee.role !== "investigator" && assignee.role !== "admin") {
    throw unprocessable(
      `User "${assignee.name}" holds role "${assignee.role}" and cannot be assigned as investigator`,
    );
  }

  const previous = incident.assignedInvestigatorId;
  incident.assignedInvestigatorId = assigneeId;
  if (incident.status === "reported" || incident.status === "triaged") {
    incident.status = "under_investigation";
  }
  await incident.save();

  // One active investigation per incident, enforced by the unique index.
  const investigation = await Investigation.findOneAndUpdate(
    { incidentId: id },
    {
      $setOnInsert: {
        incidentId: id,
        assignedTo: assigneeId,
        status: "pending",
        rootCauseStatus: "undetermined",
      },
    },
    { new: true, upsert: true },
  ).exec();

  // Reassignment must move the existing investigation too, not just the incident.
  if (!investigation.assignedTo.equals(assigneeId)) {
    investigation.assignedTo = assigneeId;
    await investigation.save();
  }

  await recordAudit({
    actorId: actor.id,
    action: "incident.assign",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    changes: [
      {
        field: "assignedInvestigatorId",
        before: previous ?? null,
        after: assigneeId,
      },
    ],
    metadata: note ? { note } : undefined,
  });

  await notify({
    recipientId: assigneeId,
    type: "action_required",
    title: `Assigned to incident ${incident.incidentCode}`,
    message: note ?? incident.title,
    resourceType: "incident",
    resourceId: incident._id,
  });

  return ok({
    incidentId: incident._id,
    status: incident.status,
    assignedInvestigatorId: assigneeId,
    investigationId: investigation._id,
  });
});
