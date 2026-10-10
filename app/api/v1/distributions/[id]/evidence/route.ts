import { loadDistributionForRead } from "@/lib/access";
import { forbidden } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { createUploadSignature, verifyUploadedAsset } from "@/lib/cloudinary";
import { routeObjectId } from "@/lib/validations/common";
import { distributionEvidenceSchema } from "@/lib/validations/distribution";

/**
 * Delivery evidence (PRD 8.9, 10.3).
 *
 * GET issues a scoped, short-lived upload signature; POST records an asset the
 * client has already uploaded. The asset is verified against Cloudinary before
 * being stored so arbitrary URLs cannot be passed off as evidence.
 */

export const GET = route<IdParam>(async (_request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);

  await loadDistributionForRead(actor, id);
  if (actor.role === "investigator") {
    throw forbidden("Investigators do not upload delivery evidence");
  }

  return ok(createUploadSignature("distributions", id.toString()));
});

export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const { publicId } = distributionEvidenceSchema.parse(
    await readJson(request),
  );

  const distribution = await loadDistributionForRead(actor, id);
  if (actor.role === "investigator") {
    throw forbidden("Investigators do not upload delivery evidence");
  }

  const asset = await verifyUploadedAsset(
    publicId,
    "distributions",
    id.toString(),
  );

  const entry = {
    url: asset.url,
    publicId: asset.publicId,
    uploadedAt: new Date(),
  };

  distribution.deliveryEvidence = [
    ...(distribution.deliveryEvidence ?? []),
    entry,
  ];
  await distribution.save();

  await recordAudit({
    actorId: actor.id,
    action: "distribution.evidence_add",
    resourceType: "Distribution",
    resourceId: distribution._id,
    organizationId: distribution.sppgId,
    metadata: { publicId: asset.publicId, bytes: asset.bytes },
  });

  return created(entry);
});
