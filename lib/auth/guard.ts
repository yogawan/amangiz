import type { Types } from "mongoose";
import { forbidden, unauthenticated } from "@/lib/api/errors";
import User, { type OrganizationType, type UserRole } from "@/models/User";
import { readSession } from "./session";

export interface AuthUser {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: Types.ObjectId;
}

/**
 * Resolves the caller from the session cookie and re-reads the user document.
 *
 * The DB round-trip is deliberate: a session issued before an account was
 * deactivated or had its role changed must not keep working (PRD 7.3, 10.1).
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await readSession();
  if (!session) throw unauthenticated();

  const user = await User.findById(session.sub)
    .select("name email role organizationType organizationId isActive")
    .lean<{
      _id: Types.ObjectId;
      name: string;
      email: string;
      role: UserRole;
      organizationType: OrganizationType;
      organizationId?: Types.ObjectId;
      isActive: boolean;
    }>()
    .exec();

  if (!user) throw unauthenticated("Session user no longer exists");
  if (!user.isActive) throw forbidden("This account is deactivated");

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId,
  };
}

/** Throws 403 unless the caller holds one of the allowed roles. */
export function requireRole(user: AuthUser, ...allowed: UserRole[]): void {
  if (!allowed.includes(user.role)) {
    throw forbidden(`This action requires role: ${allowed.join(" or ")}`);
  }
}

/**
 * Returns the caller's organization id, refusing the request when a
 * scope-limited role has none.
 *
 * Without this guard an `undefined` organizationId would be stripped from the
 * Mongo filter and silently widen the query to every document.
 */
export function requireOrganization(user: AuthUser): Types.ObjectId {
  if (!user.organizationId) {
    throw forbidden(
      "This account is not linked to an organization, so scoped data cannot be resolved",
    );
  }
  return user.organizationId;
}
