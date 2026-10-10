import { loadDistributionForRead } from "@/lib/access";
import { forbidden, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireOrganization, requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  DISTRIBUTION_TRANSITIONS,
  dispatchSchema,
} from "@/lib/validations/distribution";
import { assertTransition } from "@/lib/workflow";
import FoodBatch from "@/models/FoodBatch";

/** Records departure from the SPPG (PRD 8.9). */
export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (!isAdmin(actor) && actor.role !== "sppg_operator") {
    throw forbidden("Recording a dispatch requires the sending SPPG operator");
  }

  const id = await routeObjectId(params);
  const input = dispatchSchema.parse(await readJson(request));

  const distribution = await loadDistributionForRead(actor, id);

  if (
    actor.role === "sppg_operator" &&
    !distribution.sppgId.equals(requireOrganization(actor))
  ) {
    throw forbidden("This distribution belongs to another SPPG");
  }

  assertTransition(
    "Distribution status",
    distribution.status,
    "dispatched",
    DISTRIBUTION_TRANSITIONS,
  );

  // Re-checked at dispatch time: a batch may have been held after the
  // distribution was planned.
  const batch = await FoodBatch.findById(distribution.batchId)
    .select("status batchCode")
    .lean()
    .exec();
  if (batch && (batch.status === "on_hold" || batch.status === "recalled")) {
    throw unprocessable(
      `Batch ${batch.batchCode} is "${batch.status}" and must not be dispatched`,
    );
  }

  const dispatchedAt = input.dispatchedAt
    ? new Date(input.dispatchedAt)
    : new Date();

  if (dispatchedAt.getTime() > Date.now() + 60_000) {
    throw unprocessable("dispatchedAt cannot be in the future");
  }

  distribution.status = "dispatched";
  distribution.dispatchedAt = dispatchedAt;
  if (input.dispatchTemperature !== undefined) {
    distribution.dispatchTemperature = input.dispatchTemperature;
  }
  if (input.notes) distribution.notes = input.notes;
  await distribution.save();

  await recordAudit({
    actorId: actor.id,
    action: "distribution.dispatch",
    resourceType: "Distribution",
    resourceId: distribution._id,
    organizationId: distribution.sppgId,
    changes: [{ field: "status", before: "planned", after: "dispatched" }],
    metadata: {
      dispatchedAt,
      dispatchTemperature: input.dispatchTemperature,
    },
  });

  return ok({
    id: distribution._id,
    status: distribution.status,
    dispatchedAt: distribution.dispatchedAt,
  });
});
