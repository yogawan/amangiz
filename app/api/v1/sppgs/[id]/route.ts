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
import { updateSppgSchema } from "@/lib/validations/master-data";
import SPPG from "@/models/SPPG";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  assertCanReadMasterData(user);

  const sppg = await SPPG.findById(await routeObjectId(params))
    .lean()
    .exec();
  if (!sppg) throw notFound("SPPG not found");

  return ok(sppg);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const id = await routeObjectId(params);
  const input = updateSppgSchema.parse(await readJson(request));

  const existing = await SPPG.findById(id).lean().exec();
  if (!existing) throw notFound("SPPG not found");

  const updated = await SPPG.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();
  if (!updated) throw notFound("SPPG not found");

  await recordAudit({
    actorId: actor.id,
    action: "sppg.update",
    resourceType: "SPPG",
    resourceId: id,
    organizationId: id,
    changes: diffChanges(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ["name", "address", "location", "contactName", "contactPhone"],
    ),
  });

  return ok(updated);
});
