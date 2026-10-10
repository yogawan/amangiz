import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import Notification from "@/models/Notification";

/** Unread badge count for the current user (PRD 8.13). */
export const GET = route(async () => {
  const user = await requireUser();

  const unread = await Notification.countDocuments({
    recipientId: user.id,
    readAt: { $exists: false },
  }).exec();

  return ok({ unread });
});
