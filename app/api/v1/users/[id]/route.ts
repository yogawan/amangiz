import { conflict, forbidden, notFound } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { diffChanges, recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { updateUserSchema } from "@/lib/validations/user";
import User from "@/models/User";

const PROJECTION =
  "name email role organizationType organizationId isActive lastLoginAt createdAt updatedAt";

export const GET = route<IdParam>(async (_request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);

  // PRD 8.4 — admin, or the user reading their own record.
  if (!isAdmin(actor) && !actor.id.equals(id)) {
    throw forbidden("You may only read your own user record");
  }

  const user = await User.findById(id)
    .select(PROJECTION)
    .populate("organizationId", "code name")
    .lean()
    .exec();

  if (!user) throw notFound("User not found");
  return ok(user);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor)) {
    throw forbidden("Updating users is restricted to admin");
  }

  const id = await routeObjectId(params);
  const input = updateUserSchema.parse(await readJson(request));

  const existing = await User.findById(id).select(PROJECTION).lean().exec();
  if (!existing) throw notFound("User not found");

  if (input.email && input.email !== existing.email) {
    const taken = await User.exists({
      email: input.email,
      _id: { $ne: id },
    }).exec();
    if (taken) throw conflict("A user with this email already exists");
  }

  // An admin demoting themselves could lock the organization out of user
  // management, so it has to go through another admin.
  if (actor.id.equals(id) && input.role && input.role !== existing.role) {
    throw forbidden("You cannot change your own role");
  }

  const update: Record<string, unknown> = { ...input };
  if (input.organizationId) {
    update.organizationId = toObjectId(input.organizationId);
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true },
  )
    .select(PROJECTION)
    .lean()
    .exec();

  if (!updated) throw notFound("User not found");

  const changes = diffChanges(
    existing as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
    ["name", "email", "role", "organizationType", "organizationId"],
  );

  await recordAudit({
    actorId: actor.id,
    action: "user.update",
    resourceType: "User",
    resourceId: id,
    organizationId: updated.organizationId,
    changes,
  });

  return ok(updated);
});
