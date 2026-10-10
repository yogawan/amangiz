import { notFound, unprocessable } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { routeObjectId } from "@/lib/validations/common";
import { updateVerificationSchema } from "@/lib/validations/master-data";
import Supplier from "@/models/Supplier";

/**
 * Records the outcome of a supplier verification (PRD 8.6).
 *
 * PRD 7.5 is explicit that this status must reflect a verification that was
 * actually carried out, so the endpoint stores who decided it and when, and
 * rejects a no-op re-submission.
 */
export const PATCH = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  if (actor.role !== "admin" && actor.role !== "investigator") {
    throw unprocessable(
      "Supplier verification may only be recorded by admin or an authorized officer",
    );
  }

  const id = await routeObjectId(params);
  const { verificationStatus, notes } = updateVerificationSchema.parse(
    await readJson(request),
  );

  const existing = await Supplier.findById(id)
    .select("verificationStatus code")
    .lean()
    .exec();
  if (!existing) throw notFound("Supplier not found");

  if (existing.verificationStatus === verificationStatus) {
    throw unprocessable(
      `This supplier is already marked "${verificationStatus}"`,
    );
  }

  await Supplier.updateOne(
    { _id: id },
    { $set: { verificationStatus } },
  ).exec();

  await recordAudit({
    actorId: actor.id,
    action: "supplier.verification_change",
    resourceType: "Supplier",
    resourceId: id,
    changes: [
      {
        field: "verificationStatus",
        before: existing.verificationStatus,
        after: verificationStatus,
      },
    ],
    metadata: notes ? { notes } : undefined,
  });

  return ok({
    id,
    verificationStatus,
    decidedBy: actor.id,
    decidedAt: new Date(),
  });
});
