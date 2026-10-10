import { connectDB } from "@/lib/db/mongoose";
import { type AuthUser, requireUser } from "./guard";

/**
 * Non-throwing wrapper over `requireUser()` for Server Components.
 *
 * Route handlers go through `route()` in lib/api/handler.ts, which already
 * connects to the DB and lets `requireUser()` throw into a 401. Server
 * Components have neither, so this connects itself and swallows the error —
 * callers render their own signed-out/empty state instead of crashing the
 * Suspense boundary they're read inside of (Cache Components requires any
 * cookies()/session read to live inside a <Suspense>, see UI_PLAN.md §0).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    await connectDB();
    return await requireUser();
  } catch {
    return null;
  }
}

export type { AuthUser };
