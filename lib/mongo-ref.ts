import type { Types } from "mongoose";

/**
 * Mongoose's `.populate().lean()` result typing doesn't narrow to the
 * populated shape automatically — a single `"key" in value` check only tells
 * TypeScript about that one key, not the full shape. These helpers do one
 * explicit runtime check against every field the query actually selected,
 * then cast once, instead of each page re-deriving its own narrowing.
 */

export interface PopulatedRef {
  _id: Types.ObjectId;
}

export function populatedRef<T extends Record<string, unknown>>(
  value: unknown,
  keys: readonly (keyof T)[],
): (PopulatedRef & T) | null {
  if (
    value &&
    typeof value === "object" &&
    keys.every((key) => key in (value as object))
  ) {
    return value as PopulatedRef & T;
  }
  return null;
}

/** Extracts the id whether `value` is a populated ref object or a raw ObjectId. */
export function idOf(value: unknown): string {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}
