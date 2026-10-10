import { route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/guard";
import School from "@/models/School";
import SPPG from "@/models/SPPG";

/** Resolves the caller's organization name for display, if they have one. */
async function organizationSummary(
  organizationType: string,
  organizationId?: import("mongoose").Types.ObjectId,
) {
  if (!organizationId) return null;

  if (organizationType === "sppg") {
    return SPPG.findById(organizationId)
      .select("code name status")
      .lean()
      .exec();
  }
  if (organizationType === "school") {
    return School.findById(organizationId)
      .select("code name level status")
      .lean()
      .exec();
  }
  return null;
}

export const GET = route(async () => {
  const user = await requireUser();
  const organization = await organizationSummary(
    user.organizationType,
    user.organizationId,
  );

  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId ?? null,
    organization,
  });
});
