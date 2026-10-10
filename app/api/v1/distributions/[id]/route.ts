import { loadDistributionForRead } from "@/lib/access";
import { forbidden } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { isAdmin } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import {
  DISTRIBUTION_TRANSITIONS,
  updateDistributionSchema,
} from "@/lib/validations/distribution";
import { assertTransition } from "@/lib/workflow";
import type { IAuditLogChange } from "@/models/AuditLog";
import Distribution from "@/models/Distribution";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  await loadDistributionForRead(user, id);

  const distribution = await Distribution.findById(id)
    .populate("batchId", "batchCode menuName productionDate status sppgId")
    .populate("schoolId", "code name level address")
    .populate("sppgId", "code name")
    .populate("createdBy", "name email")
    .lean()
    .exec();

  return ok(distribution);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = updateDistributionSchema.parse(await readJson(request));

  const distribution = await loadDistributionForRead(actor, id);

  // Reading is wider than writing here: only the sending SPPG or an admin may
  // amend the shipment record.
  if (!isAdmin(actor) && actor.role !== "sppg_operator") {
    throw forbidden("Updating a distribution requires admin or SPPG operator");
  }

  const changes: IAuditLogChange[] = [];

  if (input.status && input.status !== distribution.status) {
    assertTransition(
      "Distribution status",
      distribution.status,
      input.status,
      DISTRIBUTION_TRANSITIONS,
    );
    changes.push({
      field: "status",
      before: distribution.status,
      after: input.status,
    });
    distribution.status = input.status;
  }

  if (input.quantity !== undefined) {
    changes.push({
      field: "quantity",
      before: distribution.quantity,
      after: input.quantity,
    });
    distribution.quantity = input.quantity;
  }
  if (input.unit !== undefined) distribution.unit = input.unit;
  if (input.scheduledAt !== undefined) {
    distribution.scheduledAt = new Date(input.scheduledAt);
  }
  if (input.notes !== undefined) distribution.notes = input.notes;

  await distribution.save();

  await recordAudit({
    actorId: actor.id,
    action: "distribution.update",
    resourceType: "Distribution",
    resourceId: distribution._id,
    organizationId: distribution.sppgId,
    changes,
  });

  return ok(distribution);
});
