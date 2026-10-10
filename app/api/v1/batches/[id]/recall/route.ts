import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import { batchActionSchema } from "@/lib/validations/batch";
import { routeObjectId } from "@/lib/validations/common";
import { applyBatchContainment } from "@/services/batch.service";

/**
 * Records an official recall (PRD 8.8).
 *
 * `recalled` is terminal and semantically distinct from `on_hold` (PRD 7.7), so
 * this is admin-only and cannot be undone through the status endpoint.
 */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const { reason, notes } = batchActionSchema.parse(await readJson(request));

  const batch = await applyBatchContainment({
    actor,
    batchId: await routeObjectId(params),
    action: "recall",
    reason,
    notes,
  });

  return ok({
    id: batch._id,
    batchCode: batch.batchCode,
    status: batch.status,
  });
});
