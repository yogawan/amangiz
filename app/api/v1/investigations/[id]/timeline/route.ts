import { loadInvestigationForWrite } from "@/lib/access";
import { unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import { addTimelineEntrySchema } from "@/lib/validations/investigation";

/** Appends a chronology entry (PRD 8.12). */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = addTimelineEntrySchema.parse(await readJson(request));

  const investigation = await loadInvestigationForWrite(actor, id);

  const occurredAt = new Date(input.occurredAt);
  if (occurredAt.getTime() > Date.now() + 60_000) {
    throw unprocessable("occurredAt cannot be in the future");
  }

  const entry = {
    occurredAt,
    action: input.action,
    description: input.description,
    actorId: actor.id,
  };

  investigation.timeline.push(entry);

  // Recording work implies the case is underway.
  if (investigation.status === "pending") {
    investigation.status = "in_progress";
  }
  await investigation.save();

  await recordAudit({
    actorId: actor.id,
    action: "investigation.timeline_add",
    resourceType: "Investigation",
    resourceId: investigation._id,
    metadata: { action: input.action, occurredAt },
  });

  return created(entry);
});
