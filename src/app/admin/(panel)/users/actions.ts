"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission } from "@/lib/admin";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";
import { canDeleteAdmin } from "@/lib/delete-guard";

const fail = (m: string): never => redirect(`/admin/users?error=${encodeURIComponent(m)}`);
const roleSchema = z.enum(ROLES as unknown as [string, ...string[]]) as z.ZodType<"DEVELOPER" | "OWNER" | "STAFF">;

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  role: roleSchema,
  password: z.string().min(12, "Kata sandi minimal 12 karakter").max(128),
});

/** Jumlah Developer aktif selain `exceptId`. Sistem harus selalu punya minimal satu. */
const otherActiveDevelopers = (exceptId: string) => db.adminUser.count({ where: { role: "DEVELOPER", isActive: true, id: { not: exceptId } } });

export async function createAdmin(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage"); // hanya Admin/Developer
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Data tidak valid.");
  const d = parsed.data;
  if (/^(.)\1+$/.test(d.password) || d.password.toLowerCase().includes(d.email.split("@")[0])) return fail("Kata sandi terlalu lemah.");
  try {
    const u = await db.adminUser.create({ data: { name: d.name, email: d.email, role: d.role, passwordHash: await hashPassword(d.password) } });
    await audit(me.id, "admin.create", "AdminUser", u.id, { role: d.role });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("Email sudah terdaftar.");
    throw e;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setAdminActive(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const id = z.string().cuid().parse(formData.get("id"));
  const active = formData.get("active") === "1";
  if (id === me.id) return fail("Tidak bisa menonaktifkan akun sendiri.");
  if (!active) {
    const target = await db.adminUser.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "DEVELOPER" && (await otherActiveDevelopers(id)) === 0) return fail("Harus ada minimal satu Admin/Developer aktif.");
  }
  // Akun yang dinonaktifkan melepas semua inquiry/klaim yang masih berjalan agar tidak "tersangkut" pada orang yang sudah tidak aktif.
  const update = db.adminUser.update({ where: { id }, data: { isActive: active, failedLogins: 0, lockedUntil: null, ...(active ? {} : { sessionVersion: { increment: 1 } }) } });
  let releasedInquiries = 0;
  if (active) {
    await update;
  } else {
    const [, inq] = await db.$transaction([
      update,
      db.inquiry.updateMany({ where: { assigneeId: id, status: { notIn: ["DELIVERED", "CANCELLED", "EXPIRED"] } }, data: { assigneeId: null, assignedAt: null } }),
      db.warrantyClaim.updateMany({ where: { assigneeId: id, status: { in: ["SUBMITTED", "REVIEWING", "APPROVED", "IN_SERVICE", "READY"] } }, data: { assigneeId: null } }),
    ]);
    releasedInquiries = inq.count;
  }
  await audit(me.id, active ? "admin.activate" : "admin.deactivate", "AdminUser", id, active ? undefined : { releasedInquiries });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin/claims");
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function setAdminRole(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const id = z.string().cuid().parse(formData.get("id"));
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!parsed.success) return fail("Peran tidak valid.");
  const role = parsed.data;
  if (id === me.id) return fail("Tidak bisa mengubah peran akun sendiri.");

  const target = await db.adminUser.findUnique({ where: { id }, select: { role: true, isActive: true } });
  if (!target) return fail("Akun tidak ditemukan.");
  if (target.role === role) redirect("/admin/users");
  if (target.role === "DEVELOPER" && target.isActive && (await otherActiveDevelopers(id)) === 0) return fail("Harus ada minimal satu Admin/Developer aktif.");

  await db.adminUser.update({ where: { id }, data: { role, sessionVersion: { increment: 1 } } }); // peran baru berlaku setelah login ulang
  await audit(me.id, "admin.role_change", "AdminUser", id, { from: target.role, to: role });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

const isWeak = (password: string, email: string) => /^(.)\1+$/.test(password) || password.toLowerCase().includes(email.split("@")[0].toLowerCase());

export async function updateAdmin(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const d = z.object({ id: z.string().cuid(), name: z.string().trim().min(2).max(60), email: z.string().trim().toLowerCase().email().max(120) }).safeParse(Object.fromEntries(formData));
  if (!d.success) return fail("Nama atau email tidak valid.");
  try {
    await db.adminUser.update({ where: { id: d.data.id }, data: { name: d.data.name, email: d.data.email } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail("Email sudah dipakai akun lain.");
    throw e;
  }
  await audit(me.id, "admin.update", "AdminUser", d.data.id);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function resetAdminPassword(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const d = z.object({ id: z.string().cuid(), password: z.string().min(12, "Kata sandi minimal 12 karakter").max(128) }).safeParse(Object.fromEntries(formData));
  if (!d.success) return fail(d.error.issues[0]?.message ?? "Data tidak valid.");
  const target = await db.adminUser.findUnique({ where: { id: d.data.id }, select: { email: true } });
  if (!target) return fail("Akun tidak ditemukan.");
  if (isWeak(d.data.password, target.email)) return fail("Kata sandi terlalu lemah.");
  const updated = await db.adminUser.update({ where: { id: d.data.id }, data: { passwordHash: await hashPassword(d.data.password), failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } }, select: { sessionVersion: true, role: true } });
  // Bila yang diatur ulang adalah akun sendiri, terbitkan sesi baru agar tidak ikut terlempar keluar.
  if (d.data.id === me.id) await setSessionCookie(await createSessionToken({ sub: me.id, role: updated.role, sv: updated.sessionVersion }));
  await audit(me.id, "admin.password_reset", "AdminUser", d.data.id);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Hapus permanen akun. Untuk berhenti sementara, gunakan Nonaktifkan. Jejak audit tetap tersimpan. */
export async function deleteAdmin(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const id = z.string().cuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Data tidak valid.");
  const target = await db.adminUser.findUnique({ where: { id: id.data }, select: { email: true, role: true, isActive: true } });
  if (!target) return fail("Akun tidak ditemukan.");
  const blocked = canDeleteAdmin({ isSelf: id.data === me.id, targetRole: target.role, targetActive: target.isActive, otherActiveDevelopers: await otherActiveDevelopers(id.data) });
  if (blocked) return fail(blocked);
  await db.adminUser.delete({ where: { id: id.data } });
  await audit(me.id, "admin.delete", "AdminUser", id.data, { email: target.email, role: target.role });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Putus semua sesi login sebuah akun (mis. perangkat hilang) tanpa menonaktifkan atau mengganti sandinya. */
export async function revokeAdminSessions(formData: FormData): Promise<void> {
  const me = await requirePermission("user.manage");
  const id = z.string().cuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Data tidak valid.");
  if (id.data === me.id) return fail("Untuk akun sendiri gunakan “Keluar semua perangkat” di panel kiri.");
  await db.adminUser.update({ where: { id: id.data }, data: { sessionVersion: { increment: 1 } } });
  await audit(me.id, "admin.sessions_revoked", "AdminUser", id.data);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
