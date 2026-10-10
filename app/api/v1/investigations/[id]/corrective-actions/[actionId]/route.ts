import { loadInvestigationForRead } from "@/lib/access";
import { forbidden, notFound, unprocessable } from "@/lib/api/errors";
import { type RouteParams, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { toObjectId } from "@/lib/validations/common";
import { updateCorrectiveActionSchema } from "@/lib/validations/investigation";
import type { IAuditLogChange } from "@/models/AuditLog";

type Params = RouteParams<{ id: string; actionId: string }>;

/**
 * Updates one corrective action (PRD 8.12).
 *
 * Unlike the other investigation sub-resources, the action's own owner may also
 * update it — they are the person accountable for completing it — alongside the
 * assigned investigator and admins.
 */
export const PATCH = route<Params>(async (request, { params }) => {
  const actor = await requireUser();
  const { id: rawId, actionId: rawActionId } = await params;
  const id = toObjectId(rawId);
  const actionId = toObjectId(rawActionId);

  const input = updateCorrectiveActionSchema.parse(await readJson(request));

  const investigation = await loadInvestigationForRead(actor, id);
  const action = investigation.correctiveActions.find((entry) =>
    entry._id.equals(actionId),
  );
  if (!action) throw notFound("Corrective action not found");

  const isOwner = action.ownerId.equals(actor.id);
  const isAssigned = investigation.assignedTo.equals(actor.id);
  if (!isAdmin(actor) && !isAssigned && !isOwner) {
    throw forbidden(
      "Only the action owner, the assigned investigator, or an admin may update this action",
    );
  }

  if (investigation.status === "completed") {
    throw unprocessable(
      "This investigation is completed and its actions can no longer be edited",
    );
  }

  const changes: IAuditLogChange[] = [];

  // Reassigning or rewording the action is not the owner's call; they report
  // progress on it.
  if (input.action !== undefined || input.ownerId !== undefined) {
    if (!isAdmin(actor) && !isAssigned) {
      throw forbidden(
        "Only the assigned investigator or an admin may change the action text or owner",
      );
    }
    if (input.action !== undefined) {
      changes.push({
        field: "action",
        before: action.action,
        after: input.action,
      });
      action.action = input.action;
    }
    if (input.ownerId !== undefined) {
      const nextOwner = toObjectId(input.ownerId);
      changes.push({
        field: "ownerId",
        before: action.ownerId,
        after: nextOwner,
      });
      action.ownerId = nextOwner;
    }
  }

  if (input.dueAt !== undefined) {
    action.dueAt = new Date(input.dueAt);
  }

  if (input.status !== undefined && input.status !== action.status) {
    changes.push({
      field: "status",
      before: action.status,
      after: input.status,
    });
    action.status = input.status;
    // completedAt mirrors status so a reopened action does not keep a stale
    // completion timestamp.
    action.completedAt = input.status === "completed" ? new Date() : undefined;
  }

  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.corrective_action_update",
    resourceType: "Investigation",
    resourceId: investigation._id,
    changes,
    metadata: { actionId },
  });

  return ok(action);
});
