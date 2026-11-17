import { test } from "node:test";
import assert from "node:assert/strict";
import { can, isRole, PERMISSIONS, ROLE_LABEL, type Permission } from "../src/lib/rbac.ts";

const all = Object.keys(PERMISSIONS) as Permission[];

test("Developer punya semua izin", () => {
  for (const p of all) assert.equal(can("DEVELOPER", p), true, p);
});

test("Owner punya semua izin kecuali mengelola akun/peran dan ubah-hapus data master", () => {
  for (const p of all) assert.equal(can("OWNER", p), p !== "user.manage" && p !== "data.manage", p);
});

test("Staff hanya memproses inquiry", () => {
  const allowed = all.filter((p) => can("STAFF", p)).sort();
  // order.fulfil: Staff boleh menandai Dikirim/Selesai (operasional), tanpa akses angka keuangan.
  assert.deepEqual(allowed, ["inquiry.update", "inquiry.view", "invoice.issue", "order.fulfil"]);
});

test("Staff tidak melihat keuangan, nomor HP lengkap, atau laporan", () => {
  for (const p of ["finance.view", "pii.view", "report.view", "order.write", "stock.review"] as const) {
    assert.equal(can("STAFF", p), false, p);
  }
});

test("peran tidak dikenal atau kosong ditolak", () => {
  assert.equal(can(undefined, "inquiry.view"), false);
  assert.equal(can(null, "inquiry.view"), false);
  assert.equal(can("HACKER" as never, "inquiry.view"), false);
});

test("isRole dan label", () => {
  assert.equal(isRole("OWNER"), true);
  assert.equal(isRole("owner"), false);
  assert.equal(isRole(undefined), false);
  assert.equal(ROLE_LABEL.DEVELOPER, "Admin / Developer");
});
