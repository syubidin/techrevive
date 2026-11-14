"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";

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
  await db.adminUser.update({ where: { id }, data: { isActive: active, failedLogins: 0, lockedUntil: null } });
  await audit(me.id, active ? "admin.activate" : "admin.deactivate", "AdminUser", id);
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

  await db.adminUser.update({ where: { id }, data: { role } });
  await audit(me.id, "admin.role_change", "AdminUser", id, { from: target.role, to: role });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}
