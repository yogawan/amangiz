import { loadIncidentForRead } from "@/lib/access";
import { forbidden } from "@/lib/api/errors";
import { type IdParam, readJson, route } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import {
  createUploadSignature,
  evidenceFileType,
  verifyUploadedAsset,
} from "@/lib/cloudinary";
import { routeObjectId } from "@/lib/validations/common";
import { incidentEvidenceSchema } from "@/lib/validations/incident";

/**
 * Incident evidence (PRD 8.10, 10.3).
 *
 * GET returns a scoped upload signature; POST records an already-uploaded asset
 * after verifying it exists in the expected Cloudinary folder.
 */

export const GET = route<IdParam>(async (_request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);

  await loadIncidentForRead(actor, id);
  return ok(createUploadSignature("incidents", id.toString()));
});

export const POST = route<IdParam>(async (request, { params }) => {
  const actor = await requireUser();
  const id = await routeObjectId(params);
  const input = incidentEvidenceSchema.parse(await readJson(request));

  const incident = await loadIncidentForRead(actor, id);

  // A closed case is a documentation record; new evidence belongs on a reopened
  // or new case rather than being appended silently.
  if (incident.status === "closed") {
    throw forbidden("Evidence cannot be added to a closed incident");
  }

  const asset = await verifyUploadedAsset(
    input.publicId,
    "incidents",
    id.toString(),
  );

  const entry = {
    url: asset.url,
    publicId: asset.publicId,
    fileType: evidenceFileType(asset.format),
    description: input.description,
    uploadedAt: new Date(),
  };

  incident.evidence.push(entry);
  await incident.save();

  await recordAudit({
    actorId: actor.id,
    action: "incident.evidence_add",
    resourceType: "Incident",
    resourceId: incident._id,
    organizationId: incident.sppgId ?? incident.schoolId,
    metadata: { publicId: asset.publicId, fileType: entry.fileType },
  });

  return created(entry);
});
