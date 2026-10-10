import type { Types } from "mongoose";
import { unauthenticated } from "@/lib/api/errors";
import { readJson, route } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { recordAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";
import User, { type OrganizationType, type UserRole } from "@/models/User";

interface AuthenticatableUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: Types.ObjectId;
  isActive: boolean;
}

export const POST = route(async (request) => {
  rateLimit(clientKey(request, "login"), 10, 5 * 60 * 1000);

  const { email, password } = loginSchema.parse(await readJson(request));

  // passwordHash carries `select: false`, so it must be opted into explicitly.
  const user = await User.findOne({ email })
    .select("+passwordHash")
    .lean<AuthenticatableUser | null>()
    .exec();

  // Same message whether the email is unknown or the password is wrong, so the
  // endpoint cannot be used to enumerate registered accounts.
  const invalid = unauthenticated("Email or password is incorrect");
  if (!user) throw invalid;

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) throw invalid;

  // Checked only after the password verifies, so the deactivated state is not
  // disclosed to someone who does not already hold the credentials.
  if (!user.isActive) {
    throw unauthenticated(
      "This account is deactivated. Contact an administrator.",
    );
  }

  await setSessionCookie({
    sub: user._id.toString(),
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId?.toString(),
  });

  await User.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() } },
  ).exec();

  await recordAudit({
    actorId: user._id,
    action: "auth.login",
    resourceType: "User",
    resourceId: user._id,
    organizationId: user.organizationId,
  });

  return ok({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationType: user.organizationType,
    organizationId: user.organizationId ?? null,
  });
});
