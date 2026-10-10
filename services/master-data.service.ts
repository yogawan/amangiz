import type { z } from "zod";
import type { AuthUser } from "@/lib/auth/guard";
import {
  assertCanManageUsers,
  assertCanReadMasterData,
} from "@/lib/permissions";
import {
  buildSort,
  mergeFilters,
  paginationMeta,
  searchFilter,
  skipFor,
} from "@/lib/validations/common";
import type {
  masterDataListQuerySchema,
  schoolListQuerySchema,
  supplierListQuerySchema,
} from "@/lib/validations/master-data";
import type { userListQuerySchema } from "@/lib/validations/user";
import School from "@/models/School";
import SPPG from "@/models/SPPG";
import Supplier from "@/models/Supplier";
import User from "@/models/User";

/**
 * Read queries for the four tabs on `/app/users` (PRD 8.4–8.7), extracted from
 * app/api/v1/{users,sppgs,suppliers,schools}/route.ts GET handlers so the
 * Server Component page and the API share one scope-filtered query each
 * (UI_PLAN.md §0 no-logic-drift rule). Callers parse the query schema
 * themselves (from a `NextRequest` in the route, from `searchParams` in the
 * page) and pass in the already-validated object.
 */

type UserListQuery = z.infer<typeof userListQuerySchema>;
type MasterDataListQuery = z.infer<typeof masterDataListQuerySchema>;
type SupplierListQuery = z.infer<typeof supplierListQuerySchema>;
type SchoolListQuery = z.infer<typeof schoolListQuerySchema>;

const USER_SORTABLE = [
  "name",
  "email",
  "role",
  "createdAt",
  "lastLoginAt",
] as const;

export async function listUsers(actor: AuthUser, query: UserListQuery) {
  assertCanManageUsers(actor);

  const filter = mergeFilters(
    searchFilter(query.search, ["name", "email"]),
    query.role ? { role: query.role } : {},
    query.isActive === undefined ? {} : { isActive: query.isActive },
  );

  const [data, total] = await Promise.all([
    User.find(filter)
      .select(
        "name email role organizationType organizationId isActive lastLoginAt createdAt",
      )
      .sort(
        buildSort(query.sortBy, query.sortOrder, USER_SORTABLE, "createdAt"),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    User.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

const SPPG_SORTABLE = ["code", "name", "status", "createdAt"] as const;

export async function listSppgs(actor: AuthUser, query: MasterDataListQuery) {
  assertCanReadMasterData(actor);

  const filter = mergeFilters(
    searchFilter(query.search, ["code", "name", "address.city"]),
    query.status ? { status: query.status } : {},
    query.province ? { "address.province": query.province } : {},
    query.city ? { "address.city": query.city } : {},
  );

  const [data, total] = await Promise.all([
    SPPG.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SPPG_SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    SPPG.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

const SUPPLIER_SORTABLE = [
  "code",
  "name",
  "supplierType",
  "verificationStatus",
  "createdAt",
] as const;

export async function listSuppliers(actor: AuthUser, query: SupplierListQuery) {
  assertCanReadMasterData(actor);

  const filter = mergeFilters(
    searchFilter(query.search, ["code", "name", "contactName"]),
    query.status ? { status: query.status } : {},
    query.supplierType ? { supplierType: query.supplierType } : {},
    query.verificationStatus
      ? { verificationStatus: query.verificationStatus }
      : {},
  );

  const [data, total] = await Promise.all([
    Supplier.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SUPPLIER_SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    Supplier.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

const SCHOOL_SORTABLE = ["code", "name", "level", "createdAt"] as const;

export async function listSchools(actor: AuthUser, query: SchoolListQuery) {
  // A school operator sees only their own school in this directory (same
  // scoping as the route — /app/users is admin-only today, but the function
  // stays correct for any future caller).
  const ownScope =
    actor.role === "school_operator" && actor.organizationId
      ? { _id: actor.organizationId }
      : {};

  const filter = mergeFilters(
    ownScope,
    searchFilter(query.search, ["code", "name", "address.city"]),
    query.status ? { status: query.status } : {},
    query.level ? { level: query.level } : {},
  );

  const [data, total] = await Promise.all([
    School.find(filter)
      .sort(buildSort(query.sortBy, query.sortOrder, SCHOOL_SORTABLE, "name"))
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    School.countDocuments(filter).exec(),
  ]);

  return {
    data,
    pagination: paginationMeta(query.page, query.limit, total),
    scopedToOwnSchool: actor.role === "school_operator",
  };
}
