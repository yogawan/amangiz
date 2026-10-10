import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { clearSessionCookie, readSession } from "@/lib/auth/session";
import { toObjectId } from "@/lib/validations/common";

export const POST = route(async () => {
  const session = await readSession();

  // Always clear the cookie, even for an already-invalid session, so a stale
  // token cannot be left behind by a failed logout.
  await clearSessionCookie();

  if (session) {
    const actorId = toObjectId(session.sub);
    await recordAudit({
      actorId,
      action: "auth.logout",
      resourceType: "User",
      resourceId: actorId,
    });
  }

  return ok({ loggedOut: true });
});
