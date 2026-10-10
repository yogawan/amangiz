import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { setSessionCookie } from "@/lib/auth/session";

/**
 * Re-issues the session cookie with a fresh expiry (PRD 8.2).
 *
 * `requireUser` re-reads the user, so a role change or deactivation that
 * happened after the current token was minted is picked up here and the new
 * token carries the corrected claims.
 */
export const POST = route(async () => {
  const user = await requireUser();

  await setSessionCookie({
    sub: user.id.toString(),
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId?.toString(),
  });

  return ok({
    refreshed: true,
    role: user.role,
    organizationType: user.organizationType,
  });
});
