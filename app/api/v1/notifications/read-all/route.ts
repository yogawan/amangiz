import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import Notification from "@/models/Notification";

/** Marks every unread notification for the caller as read (PRD 8.13). */
export const POST = route(async () => {
  const user = await requireUser();

  const result = await Notification.updateMany(
    { recipientId: user.id, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  ).exec();

  return ok({ markedRead: result.modifiedCount });
});
