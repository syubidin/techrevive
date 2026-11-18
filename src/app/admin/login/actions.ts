"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, clientIpHash, getAdminOrNull } from "@/lib/admin";
import { clearSessionCookie, createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(200) });

export interface LoginState { error?: string }

// Pesan error SELALU sama agar tidak membocorkan apakah email terdaftar.
const GENERIC = "Email atau kata sandi salah.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;

  const ipHash = await clientIpHash();
  const [byIp, byEmail] = await Promise.all([rateLimit(`login:ip:${ipHash}`, 20, 900), rateLimit(`login:em:${email}`, 8, 900)]);
  if (!byIp.allowed || !byEmail.allowed) return { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };

  const user = await db.adminUser.findUnique({ where: { email } });
  const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
  // Verifikasi tetap dijalankan walau akun terkunci/nonaktif agar waktu respons seragam.
  const ok = await verifyPassword(user?.passwordHash ?? null, password);

  if (!user || !user.isActive || locked || !ok) {
    if (user && !locked) {
      // Penambahan atomik agar percobaan paralel tidak "lolos" dari hitungan kunci akun.
      const { failedLogins } = await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
      const lock = failedLogins >= MAX_FAILS;
      if (lock) await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } });
      await audit(user.id, lock ? "auth.locked" : "auth.failed", "AdminUser", user.id);
    }
    return { error: locked ? "Akun terkunci sementara. Coba lagi nanti." : GENERIC };
  }

  await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await setSessionCookie(await createSessionToken({ sub: user.id, role: user.role, sv: user.sessionVersion }));
  await audit(user.id, "auth.login", "AdminUser", user.id);
  redirect("/admin");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

/** Keluar dari SEMUA perangkat: menaikkan versi sesi sehingga semua token lama (termasuk di perangkat lain) tidak berlaku. */
export async function logoutEverywhere() {
  const me = await getAdminOrNull();
  if (me) {
    await db.adminUser.update({ where: { id: me.id }, data: { sessionVersion: { increment: 1 } } });
    await audit(me.id, "auth.logout_all", "AdminUser", me.id);
  }
  await clearSessionCookie();
  redirect("/admin/login");
}
