import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api/errors";
import type { PaginationMeta } from "@/lib/api/response";

/** A 24-character hex Mongo ObjectId, as a string. */
export const objectIdSchema = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Must be a valid ObjectId",
  });

/** Accepts both `2026-10-01` and a full ISO 8601 timestamp (PRD 8.15, 10.4). */
export const isoDateSchema = z.union([z.iso.date(), z.iso.datetime()]);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listQuerySchema = paginationSchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  sortBy: z.string().trim().min(1).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function parseQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): z.infer<T> {
  return schema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  ) as z.infer<T>;
}

export function toObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw badRequest(`Invalid id: ${value}`);
  }
  return new Types.ObjectId(value);
}

/** Resolves a route's `params` promise and validates the `id` segment. */
export async function routeObjectId(
  params: Promise<{ id: string }>,
): Promise<Types.ObjectId> {
  const { id } = await params;
  return toObjectId(id);
}

export function skipFor(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Builds an inclusive date-range filter fragment for `field`.
 * `to` is pushed to the end of the day when given as a bare date so
 * `?to=2026-10-31` includes that whole day.
 */
export function dateRangeFilter(
  field: string,
  from?: string,
  to?: string,
): Record<string, unknown> {
  if (!from && !to) return {};
  const range: Record<string, Date> = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const isBareDate = /^\d{4}-\d{2}-\d{2}$/.test(to);
    range.$lte = isBareDate ? new Date(`${to}T23:59:59.999Z`) : new Date(to);
  }
  return { [field]: range };
}

/**
 * Whitelists the sort field. An unvalidated `sortBy` would let callers sort by
 * arbitrary unindexed paths, so anything unrecognised falls back to `fallback`.
 */
export function buildSort(
  sortBy: string | undefined,
  sortOrder: "asc" | "desc",
  allowed: readonly string[],
  fallback: string,
): Record<string, 1 | -1> {
  const field = sortBy && allowed.includes(sortBy) ? sortBy : fallback;
  return { [field]: sortOrder === "asc" ? 1 : -1 };
}

/** Case-insensitive, anchored-anywhere search across the given fields. */
export function searchFilter(
  search: string | undefined,
  fields: readonly string[],
): Record<string, unknown> {
  if (!search) return {};
  // Escape regex metacharacters so user input cannot alter the pattern.
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
}

/** Merges filter fragments, combining multiple `$or` clauses under `$and`. */
export function mergeFilters(
  ...fragments: Record<string, unknown>[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  const andClauses: Record<string, unknown>[] = [];

  for (const fragment of fragments) {
    for (const [key, value] of Object.entries(fragment)) {
      if (key === "$or") {
        // Two independent $or sets must both hold, so push them into $and
        // instead of letting the later one overwrite the earlier.
        andClauses.push({ $or: value });
      } else {
        merged[key] = value;
      }
    }
  }

  if (andClauses.length === 1) {
    Object.assign(merged, andClauses[0]);
  } else if (andClauses.length > 1) {
    merged.$and = andClauses;
  }

  return merged;
}
