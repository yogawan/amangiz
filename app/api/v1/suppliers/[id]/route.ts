import { notFound } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { diffChanges, recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import {
  assertCanReadMasterData,
  assertCanWriteMasterData,
} from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import { updateSupplierSchema } from "@/lib/validations/master-data";
import Supplier from "@/models/Supplier";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  assertCanReadMasterData(user);

  const supplier = await Supplier.findById(await routeObjectId(params))
    .lean()
    .exec();
  if (!supplier) throw notFound("Supplier not found");

  return ok(supplier);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const id = await routeObjectId(params);
  const input = updateSupplierSchema.parse(await readJson(request));

  const existing = await Supplier.findById(id).lean().exec();
  if (!existing) throw notFound("Supplier not found");

  const updated = await Supplier.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();
  if (!updated) throw notFound("Supplier not found");

  await recordAudit({
    actorId: actor.id,
    action: "supplier.update",
    resourceType: "Supplier",
    resourceId: id,
    changes: diffChanges(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      [
        "name",
        "supplierType",
        "address",
        "contactName",
        "contactPhone",
        "status",
      ],
    ),
  });

  return ok(updated);
});
