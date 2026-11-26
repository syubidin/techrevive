"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, clientIpHash, getAdminOrNull } from "@/lib/admin";
import { clearSessionCookie, createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { lockDurationMs, shouldLock } from "@/lib/login-policy";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(200) });

export interface LoginState { error?: string }

// Pesan error SELALU sama agar tidak membocorkan apakah email terdaftar.
const GENERIC = "Email atau kata sandi salah. Setelah beberapa kali gagal, akun dikunci sementara.";

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: GENERIC };
  const { email, password } = parsed.data;

  const ipHash = await clientIpHash();
  // Tiga lapis, semuanya awet antar instance: per IP (15 menit), per IP (24 jam), dan per email (15 menit).
  const [byIp, byIpDay, byEmail] = await Promise.all([
    rateLimit(`login:ip:${ipHash}`, 15, 900, { durable: true }),
    rateLimit(`login:ipd:${ipHash}`, 80, 86_400, { durable: true }),
    rateLimit(`login:em:${email}`, 8, 900, { durable: true }),
  ]);
  if (!byIp.allowed || !byIpDay.allowed || !byEmail.allowed) {
    const wait = Math.max(byIp.retryAfterSec, byEmail.retryAfterSec, byIpDay.allowed ? 0 : byIpDay.retryAfterSec);
    return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(wait / 60))} menit.` };
  }

  const user = await db.adminUser.findUnique({ where: { email } });
  const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
  // Verifikasi tetap dijalankan walau akun terkunci/nonaktif agar waktu respons seragam.
  const ok = await verifyPassword(user?.passwordHash ?? null, password);

  if (!user || !user.isActive || locked || !ok) {
    if (user && !locked) {
      // Penambahan atomik agar percobaan paralel tidak "lolos" dari hitungan kunci akun.
      const { failedLogins } = await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
      const lock = shouldLock(failedLogins);
      if (lock) await db.adminUser.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + lockDurationMs(failedLogins)) } });
      await audit(user.id, lock ? "auth.locked" : "auth.failed", "AdminUser", user.id);
    }
    // Pesan sama untuk semua kegagalan (termasuk akun terkunci) agar tidak membocorkan email mana yang terdaftar.
    return { error: GENERIC };
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
