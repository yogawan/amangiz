import { loadInvestigationForWrite } from "@/lib/access";
import { unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { notify } from "@/lib/notifications";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { createCorrectiveActionSchema } from "@/lib/validations/investigation";
import User from "@/models/User";

/** Creates a corrective action with an accountable owner (PRD 8.12). */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = createCorrectiveActionSchema.parse(await readJson(request));

  const investigation = await loadInvestigationForWrite(actor, id);
  const ownerId = toObjectId(input.ownerId);

  const owner = await User.findById(ownerId)
    .select("isActive name")
    .lean()
    .exec();
  if (!owner?.isActive) {
    throw unprocessable("The action owner must be an active user");
  }

  const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
  if (dueAt && dueAt.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    throw unprocessable("dueAt cannot be in the past");
  }

  investigation.correctiveActions.push({
    action: input.action,
    ownerId,
    dueAt,
    status: "pending",
  } as (typeof investigation.correctiveActions)[number]);

  if (investigation.status === "pending") {
    investigation.status = "in_progress";
  }
  await investigation.save();

  const createdAction = investigation.correctiveActions.at(-1);

  await recordAudit({
    actorId: actor.id,
    action: "investigation.corrective_action_create",
    resourceType: "Investigation",
    resourceId: investigation._id,
    metadata: { action: input.action, ownerId, dueAt },
  });

  await notify({
    recipientId: ownerId,
    type: "action_required",
    title: "You have a new corrective action",
    message: input.action,
    resourceType: "incident",
    resourceId: investigation.incidentId,
  });

  return created(createdAction);
});
