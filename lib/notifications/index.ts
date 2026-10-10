import type { Types } from "mongoose";
import Notification, {
  type NotificationResourceType,
  type NotificationType,
} from "@/models/Notification";
import User, { type UserRole } from "@/models/User";

export interface NotifyInput {
  recipientId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: Types.ObjectId;
}

/** Like `recordAudit`, a failed notification must not fail the mutation. */
async function safeInsert(documents: NotifyInput[]): Promise<void> {
  if (documents.length === 0) return;
  try {
    await Notification.insertMany(documents, { ordered: false });
  } catch (error) {
    console.error("[amangiz] failed to write notifications", error);
  }
}

export async function notify(input: NotifyInput): Promise<void> {
  await safeInsert([input]);
}

/**
 * Fans a notification out to holders of the given roles, optionally narrowed to
 * one organization.
 *
 * PRD 7.12 requires notifications to respect permission scope, so callers pass
 * the organization whose staff may legitimately see the resource rather than
 * broadcasting to a whole role.
 */
export async function notifyRoles(
  roles: UserRole[],
  payload: Omit<NotifyInput, "recipientId">,
  organizationId?: Types.ObjectId,
): Promise<void> {
  const filter: Record<string, unknown> = {
    role: { $in: roles },
    isActive: true,
  };
  if (organizationId) filter.organizationId = organizationId;

  const recipients = await User.find(filter)
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>()
    .exec();

  await safeInsert(
    recipients.map((recipient) => ({
      ...payload,
      recipientId: recipient._id,
    })),
  );
}
