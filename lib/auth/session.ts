import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { OrganizationType, UserRole } from "@/models/User";

export const SESSION_COOKIE = "amangiz_session";

const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const ALGORITHM = "HS256";

export interface SessionPayload {
  sub: string;
  role: UserRole;
  organizationType: OrganizationType;
  organizationId?: string;
}

function encodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable must be set to at least 32 characters",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encodedKey());
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), {
      algorithms: [ALGORITHM],
    });
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      organizationType: payload.organizationType as OrganizationType,
      organizationId:
        typeof payload.organizationId === "string"
          ? payload.organizationId
          : undefined,
    };
  } catch {
    // Expired or tampered token is treated the same as no session.
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
}
