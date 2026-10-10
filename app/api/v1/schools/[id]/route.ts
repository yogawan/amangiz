import { forbidden, notFound } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { diffChanges, recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { assertCanWriteMasterData } from "@/lib/permissions";
import { routeObjectId } from "@/lib/validations/common";
import { updateSchoolSchema } from "@/lib/validations/master-data";
import School from "@/models/School";

export const GET = route<IdParam>(async (_request, { params }) => {
  const user = await requireUser();
  const id = await routeObjectId(params);

  // PRD 3.3 #4 — a school operator is confined to their own school.
  if (user.role === "school_operator" && !user.organizationId?.equals(id)) {
    throw forbidden("You may only access your own school");
  }

  const school = await School.findById(id).lean().exec();
  if (!school) throw notFound("School not found");

  return ok(school);
});

export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  assertCanWriteMasterData(actor);

  const id = await routeObjectId(params);
  const input = updateSchoolSchema.parse(await readJson(request));

  const existing = await School.findById(id).lean().exec();
  if (!existing) throw notFound("School not found");

  const updated = await School.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true },
  )
    .lean()
    .exec();
  if (!updated) throw notFound("School not found");

  await recordAudit({
    actorId: actor.id,
    action: "school.update",
    resourceType: "School",
    resourceId: id,
    organizationId: id,
    changes: diffChanges(
      existing as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      [
        "name",
        "level",
        "address",
        "contactName",
        "contactPhone",
        "recipientCapacity",
        "status",
      ],
    ),
  });

  return ok(updated);
});
