import { conflict, unprocessable } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { created, paginated } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword } from "@/lib/auth/password";
import { assertCanManageUsers } from "@/lib/permissions";
import {
  buildSort,
  mergeFilters,
  paginationMeta,
  parseQuery,
  searchFilter,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import { createUserSchema, userListQuerySchema } from "@/lib/validations/user";
import School from "@/models/School";
import SPPG from "@/models/SPPG";
import User from "@/models/User";

const SORTABLE = ["name", "email", "role", "createdAt", "lastLoginAt"] as const;

export const GET = route(async (request) => {
  const user = await requireUser();
  assertCanManageUsers(user);

  const query = parseQuery(request, userListQuerySchema);

  const filter = mergeFilters(
    searchFilter(query.search, ["name", "email"]),
    query.role ? { role: query.role } : {},
    query.isActive === undefined ? {} : { isActive: query.isActive },
  );

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(
        "name email role organizationType organizationId isActive lastLoginAt createdAt",
      )
      .sort(buildSort(query.sortBy, query.sortOrder, SORTABLE, "createdAt"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ]);

  return paginated(users, paginationMeta(query.page, query.limit, total));
});

export const POST = route(async (request) => {
  const actor = await requireUser();
  assertCanManageUsers(actor);

  const input = createUserSchema.parse(await readJson(request));

  const existing = await User.exists({ email: input.email }).exec();
  if (existing) throw conflict("A user with this email already exists");

  // Verify the referenced organization exists, so a scoped account cannot be
  // created pointing at nothing.
  if (input.organizationId) {
    const organizationId = toObjectId(input.organizationId);

    // Queried per branch rather than through a shared variable: a union of two
    // model types does not resolve against the `exists()` overloads.
    const found =
      input.organizationType === "sppg"
        ? await SPPG.exists({ _id: organizationId }).exec()
        : input.organizationType === "school"
          ? await School.exists({ _id: organizationId }).exec()
          : true;

    if (!found) {
      throw unprocessable(
        `No ${input.organizationType} found for the given organizationId`,
      );
    }
  }

  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    organizationType: input.organizationType,
    organizationId: input.organizationId
      ? toObjectId(input.organizationId)
      : undefined,
    isActive: input.isActive,
  });

  await recordAudit({
    actorId: actor.id,
    action: "user.create",
    resourceType: "User",
    resourceId: user._id,
    organizationId: user.organizationId,
    metadata: { role: user.role, organizationType: user.organizationType },
  });

  return created({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId ?? null,
    isActive: user.isActive,
  });
});
