import { forbidden, notFound, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { assertCanManageUsers } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import { updateUserStatusSchema } from "@/lib/validations/user";
import User from "@/models/User";

/**
 * Activates or deactivates an account (PRD 8.4). Kept separate from the general
 * update so every status flip is independently auditable and cannot ride along
 * with an unrelated profile edit.
 */
export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  assertCanManageUsers(actor);

  const id = await routeObjectId(params);
  const { isActive, reason } = updateUserStatusSchema.parse(
    await readJson(request),
  );

  // Locking yourself out is never the intent of this endpoint.
  if (actor.id.equals(id) && !isActive) {
    throw forbidden("You cannot deactivate your own account");
  }

  const existing = await User.findById(id)
    .select("isActive organizationId role")
    .lean()
    .exec();
  if (!existing) throw notFound("User not found");

  if (existing.isActive === isActive) {
    throw unprocessable(
      `This account is already ${isActive ? "active" : "deactivated"}`,
    );
  }

  await User.updateOne({ _id: id }, { $set: { isActive } }).exec();

  await recordAudit({
    actorId: actor.id,
    action: isActive ? "user.activate" : "user.deactivate",
    resourceType: "User",
    resourceId: id,
    organizationId: existing.organizationId,
    changes: [
      { field: "isActive", before: existing.isActive, after: isActive },
    ],
    metadata: reason ? { reason } : undefined,
  });

  return ok({ id, isActive });
});
