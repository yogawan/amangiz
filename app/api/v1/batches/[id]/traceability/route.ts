import { loadBatchForRead } from "@/lib/access";
import { type IdParam, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import { buildBatchTraceability } from "@/services/traceability.service";

/**
 * Full batch trace (PRD 8.8, 9.2 #5).
 *
 * Returns only recorded relationships; distribution legs carry explicit
 * dispatch/receipt flags so an unrecorded delivery is never presented as
 * verified.
 */
export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  await loadBatchForRead(user, id);
  const trace = await buildBatchTraceability(id);

  return ok(trace, {
    note: "Only recorded relationships are shown. Legs without a receivedAt are not confirmed deliveries.",
  });
});
