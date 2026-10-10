import type { Types } from "mongoose";
import { forbidden } from "@/lib/api/errors";
import { type AuthUser, requireOrganization } from "@/lib/auth/guard";
import Distribution from "@/models/Distribution";

/** A loose Mongo filter fragment, merged with others before reaching a query. */
export type QueryFragment = Record<string, unknown>;

/**
 * Query-scoping helpers implementing the permission matrix in PRD 3.2 and the
 * authorization principles in PRD 3.3.
 *
 * Every helper returns a Mongo filter fragment to merge into a list query, or
 * throws 403 when the role has no access to the module at all. Scoped roles
 * always resolve their organization through `requireOrganization` so a missing
 * organizationId can never widen a query.
 */

export const isAdmin = (user: AuthUser): boolean => user.role === "admin";

/** PRD 3.3 #8 — the admin role is not an operational day-to-day account. */
export function assertCanManageUsers(user: AuthUser): void {
  if (!isAdmin(user)) throw forbidden("User management is restricted to admin");
}

export function assertCanWriteMasterData(user: AuthUser): void {
  if (!isAdmin(user)) {
    throw forbidden("Master data changes are restricted to admin");
  }
}

/** SPPG / Supplier / School directories are readable by every role except school operators. */
export function assertCanReadMasterData(user: AuthUser): void {
  if (user.role === "school_operator") {
    throw forbidden("This role cannot browse master data");
  }
}

export function batchScope(user: AuthUser): QueryFragment {
  switch (user.role) {
    case "admin":
    case "investigator":
      return {};
    case "sppg_operator":
      return { sppgId: requireOrganization(user) };
    case "school_operator":
      // School operators get read access only to batches that actually reached
      // their school, resolved through recorded distributions.
      throw forbidden(
        "School operators must read batches through their distributions",
      );
  }
}

/** Batch ids a school operator is allowed to see, derived from real distributions. */
export async function batchIdsForSchool(
  schoolId: Types.ObjectId,
): Promise<Types.ObjectId[]> {
  return Distribution.distinct("batchId", { schoolId }).exec();
}

export async function batchScopeAsync(user: AuthUser): Promise<QueryFragment> {
  if (user.role === "school_operator") {
    const batchIds = await batchIdsForSchool(requireOrganization(user));
    return { _id: { $in: batchIds } };
  }
  return batchScope(user);
}

export function distributionScope(user: AuthUser): QueryFragment {
  switch (user.role) {
    case "admin":
    case "investigator":
      return {};
    case "sppg_operator":
      return { sppgId: requireOrganization(user) };
    case "school_operator":
      return { schoolId: requireOrganization(user) };
  }
}

export function incidentScope(user: AuthUser): QueryFragment {
  switch (user.role) {
    case "admin":
    case "investigator":
      return {};
    case "sppg_operator":
      return { sppgId: requireOrganization(user) };
    case "school_operator":
      // Their school's incidents plus anything they personally reported.
      return {
        $or: [{ schoolId: requireOrganization(user) }, { reportedBy: user.id }],
      };
  }
}

export function assertCanReadRiskAssessment(user: AuthUser): void {
  if (user.role === "school_operator") {
    throw forbidden("This role cannot access risk assessments");
  }
}

export function assertCanRunRiskAssessment(user: AuthUser): void {
  if (user.role !== "admin" && user.role !== "investigator") {
    throw forbidden("Running a risk assessment requires investigator or admin");
  }
}

export function assertCanReadInvestigations(user: AuthUser): void {
  if (user.role !== "admin" && user.role !== "investigator") {
    throw forbidden("Investigations are restricted to investigator or admin");
  }
}

/**
 * PRD 3.3 #6 — an investigator may only mutate the cases assigned to them.
 * Admins retain override access.
 */
export function assertAssignedInvestigator(
  user: AuthUser,
  assignedTo: Types.ObjectId,
): void {
  if (isAdmin(user)) return;
  if (!assignedTo.equals(user.id)) {
    throw forbidden("You are not the assigned investigator for this case");
  }
}

export function assertCanReadAuditLog(user: AuthUser): void {
  if (user.role !== "admin" && user.role !== "investigator") {
    throw forbidden("Audit logs are restricted to admin or authorized roles");
  }
}

/** Audit logs are organization-scoped for non-admin readers. */
export function auditLogScope(user: AuthUser): QueryFragment {
  if (isAdmin(user)) return {};
  return { organizationId: requireOrganization(user) };
}
