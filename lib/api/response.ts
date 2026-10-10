import mongoose from "mongoose";
import { z } from "zod";
import { ApiError, ErrorCode } from "./errors";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Success envelope per PRD 8.1. */
export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json({ success: true, data, meta: meta ?? {} }, { status });
}

export function created<T>(data: T, meta?: Record<string, unknown>): Response {
  return ok(data, meta, 201);
}

export function paginated<T>(
  data: T[],
  pagination: PaginationMeta,
  extra?: Record<string, unknown>,
): Response {
  return ok(data, { ...pagination, ...extra });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details: unknown[] = [],
): Response {
  return Response.json(
    { success: false, error: { code, message, details } },
    { status },
  );
}

/** Mongo duplicate-key error shape, narrowed without `any`. */
function duplicateKeyFields(error: unknown): string[] | null {
  if (
    error instanceof mongoose.mongo.MongoServerError &&
    error.code === 11000
  ) {
    return Object.keys((error.keyPattern as Record<string, unknown>) ?? {});
  }
  return null;
}

/**
 * Maps a thrown value onto the PRD error envelope. Unknown errors become a
 * generic 500 so internal details never leak to the client.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return errorResponse(
      error.status,
      error.code,
      error.message,
      error.details ?? [],
    );
  }

  if (error instanceof z.ZodError) {
    return errorResponse(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Request data is invalid",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    );
  }

  const duplicated = duplicateKeyFields(error);
  if (duplicated) {
    return errorResponse(
      409,
      ErrorCode.CONFLICT,
      `Duplicate value for: ${duplicated.join(", ")}`,
      duplicated.map((field) => ({ path: field, code: "duplicate" })),
    );
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return errorResponse(
      400,
      ErrorCode.VALIDATION_ERROR,
      "Request data is invalid",
      Object.entries(error.errors).map(([path, err]) => ({
        path,
        code: "invalid",
        message: err.message,
      })),
    );
  }

  if (error instanceof mongoose.Error.CastError) {
    return errorResponse(
      400,
      ErrorCode.VALIDATION_ERROR,
      `Invalid value for ${error.path}`,
    );
  }

  console.error("[amangiz] unhandled route error:", error);
  return errorResponse(
    500,
    ErrorCode.INTERNAL_ERROR,
    "An unexpected error occurred",
  );
}
