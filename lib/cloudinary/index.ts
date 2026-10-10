import { v2 as cloudinary } from "cloudinary";
import { badRequest, unprocessable } from "@/lib/api/errors";

/**
 * Signed-upload helpers (PRD 10.3). The API secret stays server-side: clients
 * receive only a short-lived signature for a server-chosen folder.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FORMATS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "pdf",
  "doc",
  "docx",
]);

function configured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must be set",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey };
}

export type EvidenceFolder = "incidents" | "distributions" | "investigations";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/** Issues a signature scoped to one resource's folder. */
export function createUploadSignature(
  folder: EvidenceFolder,
  resourceId: string,
): UploadSignature {
  const { cloudName, apiKey } = configured();
  const timestamp = Math.round(Date.now() / 1000);
  const scopedFolder = `amangiz/${folder}/${resourceId}`;

  const signature = cloudinary.utils.api_sign_request(
    { folder: scopedFolder, timestamp },
    process.env.CLOUDINARY_API_SECRET as string,
  );

  return { cloudName, apiKey, timestamp, folder: scopedFolder, signature };
}

export interface VerifiedAsset {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
}

/**
 * Confirms an asset the client claims to have uploaded really exists, lives in
 * the expected folder, and passes the size/format limits. Without this a client
 * could persist arbitrary URLs as "evidence".
 */
export async function verifyUploadedAsset(
  publicId: string,
  folder: EvidenceFolder,
  resourceId: string,
): Promise<VerifiedAsset> {
  configured();

  const expectedPrefix = `amangiz/${folder}/${resourceId}/`;
  if (!publicId.startsWith(expectedPrefix)) {
    throw badRequest(
      `Uploaded asset must live under ${expectedPrefix}, received "${publicId}"`,
    );
  }

  let resource: Awaited<ReturnType<typeof cloudinary.api.resource>>;
  try {
    resource = await cloudinary.api.resource(publicId, {
      resource_type: "image",
    });
  } catch {
    try {
      resource = await cloudinary.api.resource(publicId, {
        resource_type: "raw",
      });
    } catch {
      throw unprocessable(
        `No uploaded asset found for publicId "${publicId}". Upload the file before recording it.`,
      );
    }
  }

  const format = String(resource.format ?? "").toLowerCase();
  const bytes = Number(resource.bytes ?? 0);

  if (format && !ALLOWED_FORMATS.has(format)) {
    throw unprocessable(`File format "${format}" is not allowed as evidence`);
  }
  if (bytes > MAX_BYTES) {
    throw unprocessable(
      `File exceeds the ${MAX_BYTES / (1024 * 1024)} MB evidence size limit`,
    );
  }

  return {
    url: String(resource.secure_url),
    publicId: String(resource.public_id),
    format,
    bytes,
    resourceType: String(resource.resource_type),
  };
}

/** Maps a Cloudinary format onto the Incident evidence file-type enum. */
export function evidenceFileType(
  format: string,
): "image" | "document" | "other" {
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(format)) return "image";
  if (["pdf", "doc", "docx"].includes(format)) return "document";
  return "other";
}
