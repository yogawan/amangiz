import type { Types } from "mongoose";
import type { z } from "zod";
import { loadBatchForRead, loadBatchForWrite } from "@/lib/access";
import { forbidden } from "@/lib/api/errors";
import { recordAudit } from "@/lib/audit";
import { type AuthUser, requireOrganization } from "@/lib/auth/guard";
import { notifyRoles } from "@/lib/notifications";
import { batchScopeAsync } from "@/lib/permissions";
import {
  BATCH_TRANSITIONS,
  type batchListQuerySchema,
  type batchStatusSchema,
} from "@/lib/validations/batch";
import {
  buildSort,
  dateRangeFilter,
  mergeFilters,
  paginationMeta,
  searchFilter,
  skipFor,
  toObjectId,
} from "@/lib/validations/common";
import { assertTransition } from "@/lib/workflow";
import FoodBatch, { type IFoodBatch } from "@/models/FoodBatch";

type BatchListQuery = z.infer<typeof batchListQuerySchema>;

const LIST_SORTABLE = [
  "batchCode",
  "menuName",
  "productionDate",
  "status",
  "createdAt",
] as const;

/** List read for `/app/batches`, mirroring app/api/v1/batches/route.ts GET. */
export async function listBatches(actor: AuthUser, query: BatchListQuery) {
  const filter = mergeFilters(
    await batchScopeAsync(actor),
    searchFilter(query.search, ["batchCode", "menuName"]),
    query.status ? { status: query.status } : {},
    query.sppgId ? { sppgId: toObjectId(query.sppgId) } : {},
    query.menuName
      ? { menuName: { $regex: query.menuName, $options: "i" } }
      : {},
    dateRangeFilter("productionDate", query.from, query.to),
  );

  const [data, total] = await Promise.all([
    FoodBatch.find(filter)
      .populate("sppgId", "code name")
      .sort(
        buildSort(
          query.sortBy,
          query.sortOrder,
          LIST_SORTABLE,
          "productionDate",
        ),
      )
      .skip(skipFor(query.page, query.limit))
      .limit(query.limit)
      .lean()
      .exec(),
    FoodBatch.countDocuments(filter).exec(),
  ]);

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

/** Detail read for `/app/batches/[id]`, mirroring app/api/v1/batches/[id]/route.ts GET. */
export async function getBatchById(actor: AuthUser, id: Types.ObjectId) {
  await loadBatchForRead(actor, id);

  return FoodBatch.findById(id)
    .populate("sppgId", "code name status")
    .populate(
      "ingredients.supplierId",
      "code name supplierType verificationStatus",
    )
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean()
    .exec();
}

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
export const ALLOWED_ROLES: Record<
  ContainmentAction,
  readonly AuthUser["role"][]
> = {
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
