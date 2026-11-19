import { SignJWT, jwtVerify } from "jose";
import { hash, verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { getEnv } from "./env";
import { normalizeSv } from "./session-version";
import { SESSION_ABSOLUTE_SEC, isIdleExpired, lastActivity } from "./session-policy";

export type AdminRole = "OWNER" | "DEVELOPER" | "STAFF";
export interface SessionPayload {
  sub: string;
  role: AdminRole;
  /** Versi sesi akun saat token dibuat. */
  sv: number;
}

const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProd ? "__Host-tr_session" : "tr_session";

const key = () => new TextEncoder().encode(getEnv().SESSION_SECRET);

export async function createSessionToken(payload: Omit<SessionPayload, "sv"> & { sv?: number }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: payload.role, sv: normalizeSv(payload.sv), la: now })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_ABSOLUTE_SEC)
    .sign(key());
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.role !== "string") return null;
    // Batas diam: terlalu lama tanpa aktivitas = sesi dianggap berakhir (pembaruan `la` dilakukan middleware).
    if (isIdleExpired(lastActivity(payload), Math.floor(Date.now() / 1000))) return null;
    return { sub: payload.sub, role: payload.role as AdminRole, sv: normalizeSv(payload.sv) };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_ABSOLUTE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  // Cookie berawalan __Host- hanya bisa ditimpa bila atributnya identik (Secure, path "/"). `cookies().delete()`
  // tidak menyertakan Secure sehingga ditolak browser dan sesi tetap hidup. Maka kedaluwarsakan secara eksplisit.
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: isProd, sameSite: "strict", path: "/", maxAge: 0, expires: new Date(0) });
}

export const hashPassword = (password: string) => hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

// Hash tiruan agar waktu respons login sama baik email ada maupun tidak (anti user enumeration).
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(storedHash: string | null, password: string): Promise<boolean> {
  if (!storedHash) {
    dummyHash ??= hashPassword("dummy-password-for-timing");
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(storedHash, password).catch(() => false);
}
