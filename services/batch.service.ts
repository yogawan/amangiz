import type { Types } from "mongoose";
import type { z } from "zod";
import { loadBatchForWrite } from "@/lib/access";
import { forbidden } from "@/lib/api/errors";
import { recordAudit } from "@/lib/audit";
import { type AuthUser, requireOrganization } from "@/lib/auth/guard";
import { notifyRoles } from "@/lib/notifications";
import {
  BATCH_TRANSITIONS,
  type batchStatusSchema,
} from "@/lib/validations/batch";
import { assertTransition } from "@/lib/workflow";
import FoodBatch, { type IFoodBatch } from "@/models/FoodBatch";

type BatchStatus = z.infer<typeof batchStatusSchema>;

export type ContainmentAction = "hold" | "release" | "recall";

const TARGET_STATUS: Record<ContainmentAction, BatchStatus> = {
  hold: "on_hold",
  release: "released",
  recall: "recalled",
};

/**
 * Who may record each containment action.
 *
 * `recall` is admin-only: PRD 8.8 frames it as recording an *official* recall,
 * and PRD 2.4 states that halting distribution remains the decision of an
 * authorised party. Hold is broader because it is a precautionary flag that
 * investigators also need to be able to raise.
 */
const ALLOWED_ROLES: Record<ContainmentAction, readonly AuthUser["role"][]> = {
  hold: ["admin", "sppg_operator", "investigator"],
  release: ["admin", "sppg_operator"],
  recall: ["admin"],
};

export interface ContainmentInput {
  actor: AuthUser;
  batchId: Types.ObjectId;
  action: ContainmentAction;
  reason: string;
  notes?: string;
}

export async function applyBatchContainment(
  input: ContainmentInput,
): Promise<IFoodBatch> {
  const { actor, batchId, action, reason, notes } = input;

  if (!ALLOWED_ROLES[action].includes(actor.role)) {
    throw forbidden(
      `Recording a batch ${action} requires: ${ALLOWED_ROLES[action].join(" or ")}`,
    );
  }

  // Investigators can raise a hold without owning the batch, so they bypass the
  // SPPG-ownership check that loadBatchForWrite applies to operators.
  const batch =
    actor.role === "investigator"
      ? await FoodBatch.findById(batchId).exec()
      : await loadBatchForWrite(actor, batchId);

  if (!batch) throw forbidden("Batch not found or outside your scope");

  if (
    actor.role === "sppg_operator" &&
    !batch.sppgId.equals(requireOrganization(actor))
  ) {
    throw forbidden("This batch belongs to another SPPG");
  }

  const target = TARGET_STATUS[action];
  assertTransition("Batch status", batch.status, target, BATCH_TRANSITIONS);

  const previousStatus = batch.status;
  batch.status = target;
  batch.updatedBy = actor.id;
  await batch.save();

  await recordAudit({
    actorId: actor.id,
    action: `batch.${action}`,
    resourceType: "FoodBatch",
    resourceId: batch._id,
    organizationId: batch.sppgId,
    changes: [{ field: "status", before: previousStatus, after: target }],
    metadata: { reason, notes, batchCode: batch.batchCode },
  });

  // A hold or recall needs to reach the people who can act on it; a release is
  // routine and does not fan out.
  if (action !== "release") {
    await notifyRoles(["admin", "investigator"], {
      type: "batch_on_hold",
      title:
        action === "recall"
          ? `Batch ${batch.batchCode} recalled`
          : `Batch ${batch.batchCode} placed on hold`,
      message: reason,
      resourceType: "batch",
      resourceId: batch._id,
    });
    await notifyRoles(
      ["sppg_operator"],
      {
        type: "batch_on_hold",
        title:
          action === "recall"
            ? `Batch ${batch.batchCode} recalled`
            : `Batch ${batch.batchCode} placed on hold`,
        message: reason,
        resourceType: "batch",
        resourceId: batch._id,
      },
      batch.sppgId,
    );
  }

  return batch;
}
