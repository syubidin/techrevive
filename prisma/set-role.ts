/**
 * Mengubah peran akun yang sudah ada (mis. menaikkan akun seed lama dari OWNER ke DEVELOPER).
 *   npm run db:set-role -- email@anda.com DEVELOPER
 * Peran: DEVELOPER (Admin/Developer, kendali penuh) | OWNER | STAFF.
 * Di aplikasi, perubahan peran dilakukan di menu Admin oleh Developer; skrip ini untuk keadaan darurat/awal.
 */
import { PrismaClient } from "@prisma/client";

const [rawEmail, rawRole] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
const role = rawRole?.trim().toUpperCase();
if (!email || !role || !["DEVELOPER", "OWNER", "STAFF"].includes(role)) {
  console.error("Pemakaian: npm run db:set-role -- email@anda.com DEVELOPER|OWNER|STAFF");
  process.exit(1);
}

const db = new PrismaClient();
const user = await db.adminUser.findUnique({ where: { email } });
if (!user) {
  console.error(`Akun ${email} tidak ditemukan.`);
  await db.$disconnect();
  process.exit(1);
}
await db.adminUser.update({ where: { email }, data: { role: role as "DEVELOPER" | "OWNER" | "STAFF", sessionVersion: { increment: 1 } } });
await db.auditLog.create({ data: { actorId: null, action: "admin.role_change", entity: "AdminUser", entityId: user.id, diff: { from: user.role, to: role, via: "script" } } });
console.log(`Peran ${email}: ${user.role} -> ${role}`);
await db.$disconnect();
