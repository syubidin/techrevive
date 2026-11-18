import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { getEnv } from "./env";
import { readSession, type AdminRole } from "./auth";
import { getClientIp, hashIp } from "./client-ip";
import { can, type Permission } from "./rbac";
import { isSessionCurrent } from "./session-version";

export interface AdminContext {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

/**
 * Dipakai di SETIAP halaman/aksi admin. Selain memverifikasi token, role dan status aktif
 * dibaca ulang dari DB, jadi admin yang dinonaktifkan/diturunkan role-nya langsung kehilangan akses.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const me = await getAdminOrNull();
  if (!me) redirect("/admin/login");
  return me;
}

/** Seperti requireAdmin, tetapi juga wajib punya izin tertentu (lihat lib/rbac.ts). */
export async function requirePermission(permission: Permission): Promise<AdminContext> {
  const me = await requireAdmin();
  if (!can(me.role, permission)) redirect("/admin?denied=1");
  return me;
}

/** Untuk route handler (API): mengembalikan null alih-alih redirect. */
/** Di-cache per permintaan: layout dan halaman sama-sama memanggilnya, tetapi DB hanya dibaca sekali. */
export const getAdminOrNull = cache(async (): Promise<AdminContext | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await db.adminUser.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true, isActive: true, sessionVersion: true } });
  if (!user || !user.isActive || !isSessionCurrent(session.sv, user.sessionVersion)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

export { can };

export async function clientIpHash(): Promise<string> {
  return hashIp(getClientIp(await headers()), getEnv().IP_HASH_SECRET);
}

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, diff?: Prisma.InputJsonValue) {
  await db.auditLog
    .create({ data: { actorId, action, entity, entityId, diff, ipHash: await clientIpHash().catch(() => null) } })
    .catch((e) => console.error(JSON.stringify({ evt: "audit.error", message: e instanceof Error ? e.message : "unknown" })));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
export const fmtDateTime = (d: Date) => d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
