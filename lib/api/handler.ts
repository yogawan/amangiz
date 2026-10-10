import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { badRequest } from "./errors";
import { toErrorResponse } from "./response";

/** Route Handler context shapes. `params` is a promise in Next.js 15+. */
export type RouteParams<T> = { params: Promise<T> };
export type IdParam = RouteParams<{ id: string }>;

/**
 * Wraps a Route Handler so every endpoint shares one database connection
 * bootstrap and one error-to-envelope mapping. Keeps individual handlers free
 * of try/catch boilerplate.
 */
export function route<Ctx>(
  handler: (request: NextRequest, context: Ctx) => Promise<Response>,
): (request: NextRequest, context: Ctx) => Promise<Response> {
  return async (request, context) => {
    try {
      await connectDB();
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Parses a JSON body, converting malformed JSON into a 400 rather than a 500. */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}
