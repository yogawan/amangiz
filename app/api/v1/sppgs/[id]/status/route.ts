import { notFound, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { assertCanWriteMasterData } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import { updateSppgStatusSchema } from "@/lib/validations/master-data";
import SPPG from "@/models/SPPG";

/**
 * Suspending an SPPG is an operational decision with downstream effects, so the
 * change is recorded with its reason and actor (PRD 8.5, 2.2 step 4).
 */
export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const id = await routeObjectId(params);
  const { status, reason } = updateSppgStatusSchema.parse(
    await readJson(request),
  );

  const existing = await SPPG.findById(id).select("status").lean().exec();
  if (!existing) throw notFound("SPPG not found");

  if (existing.status === status) {
    throw unprocessable(`This SPPG is already "${status}"`);
  }

  if (status !== "active" && !reason) {
    throw unprocessable(
      `Changing status to "${status}" requires a reason to be recorded`,
    );
  }

  await SPPG.updateOne({ _id: id }, { $set: { status } }).exec();

  await recordAudit({
    actorId: actor.id,
    action: "sppg.status_change",
    resourceType: "SPPG",
    resourceId: id,
    organizationId: id,
    changes: [{ field: "status", before: existing.status, after: status }],
    metadata: reason ? { reason } : undefined,
  });

  return ok({ id, status });
});
