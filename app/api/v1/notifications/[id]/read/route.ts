import { notFound } from "@/lib/api/errors";
import { type IdParam, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import Notification from "@/models/Notification";

/**
 * Marks one notification as read (PRD 8.13).
 *
 * `recipientId` is part of the filter rather than checked afterwards, so a
 * notification belonging to someone else is simply not found — it never leaks
 * that the id exists.
 */
export const PATCH = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  const updated = await Notification.findOneAndUpdate(
    { _id: id, recipientId: user.id, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { new: true },
  )
    .lean()
    .exec();

  if (!updated) {
    // Either it does not exist, is not theirs, or was already read. An
    // already-read notification is treated as success for idempotency.
    const alreadyRead = await Notification.findOne({
      _id: id,
      recipientId: user.id,
    })
      .lean()
      .exec();
    if (!alreadyRead) throw notFound("Notification not found");
    return ok(alreadyRead);
  }

  return ok(updated);
});
