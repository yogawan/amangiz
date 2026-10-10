import { loadBatchForRead, loadBatchForWrite } from "@/lib/access";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { BATCH_TRANSITIONS, updateBatchSchema } from "@/lib/validations/batch";
import { routeObjectId, toObjectId } from "@/lib/validations/common";
import { assertTransition } from "@/lib/workflow";
import type { IAuditLogChange } from "@/models/AuditLog";
import FoodBatch from "@/models/FoodBatch";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  // Authorise against the raw document, then re-read with refs populated.
  await loadBatchForRead(user, id);

  const batch = await FoodBatch.findById(id)
    .populate("sppgId", "code name status")
    .populate(
      "ingredients.supplierId",
      "code name supplierType verificationStatus",
    )
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean()
    .exec();

  return ok(batch);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = updateBatchSchema.parse(await readJson(request));

  const batch = await loadBatchForWrite(actor, id);
  const changes: IAuditLogChange[] = [];

  // A status move goes through the transition table; `hold`, `release` and
  // `recall` have their own endpoints and are not reachable from here.
  if (input.status && input.status !== batch.status) {
    assertTransition(
      "Batch status",
      batch.status,
      input.status,
      BATCH_TRANSITIONS,
    );
    changes.push({
      field: "status",
      before: batch.status,
      after: input.status,
    });
    batch.status = input.status;
  }

  if (input.menuName !== undefined && input.menuName !== batch.menuName) {
    changes.push({
      field: "menuName",
      before: batch.menuName,
      after: input.menuName,
    });
    batch.menuName = input.menuName;
  }
  if (input.productionDate !== undefined) {
    batch.productionDate = new Date(input.productionDate);
  }
  if (input.expiryAt !== undefined) {
    batch.expiryAt = new Date(input.expiryAt);
  }
  if (input.productionNotes !== undefined) {
    batch.productionNotes = input.productionNotes;
  }
  if (input.ingredients !== undefined) {
    batch.set(
      "ingredients",
      input.ingredients.map((item) => ({
        ...item,
        supplierId: toObjectId(item.supplierId),
      })),
    );
    changes.push({ field: "ingredients", after: input.ingredients.length });
  }
  if (input.storageTemperature !== undefined) {
    batch.set(
      "storageTemperature",
      input.storageTemperature.map((reading) => ({
        ...reading,
        recordedAt: new Date(reading.recordedAt),
      })),
    );
    changes.push({
      field: "storageTemperature",
      after: input.storageTemperature.length,
    });
  }

  batch.updatedBy = actor.id;
  await batch.save();

  await recordAudit({
    actorId: actor.id,
    action: "batch.update",
    resourceType: "FoodBatch",
    resourceId: batch._id,
    organizationId: batch.sppgId,
    changes,
  });

  return ok(batch);
});
