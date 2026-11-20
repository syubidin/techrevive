import { test } from "node:test";
import assert from "node:assert/strict";
import { assignUi, cleanNote, decideAssignment, isClaimClosed, isInquiryClosed } from "../src/lib/assignment.ts";

const base = { meId: "me", canManageOthers: false, closed: false };

test("mengambil: hanya jika belum ditugaskan; milik orang lain ditolak untuk semua peran", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: null }), { ok: true, assigneeId: "me", noop: false });
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: "me" }), { ok: true, assigneeId: "me", noop: true });
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: "x" }), { ok: false, error: "taken" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "take", currentAssigneeId: "x" }), { ok: false, error: "taken" });
});

test("melepas: hanya penanggung jawab sendiri, termasuk Owner tidak bisa melepas milik orang lain", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: "me" }), { ok: true, assigneeId: null, noop: false });
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: "x" }), { ok: false, error: "forbidden" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "release", currentAssigneeId: "x" }), { ok: false, error: "forbidden" });
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: null }), { ok: true, assigneeId: null, noop: true });
});

test("menugaskan orang lain butuh izin dan tujuan", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "assign", currentAssigneeId: null, targetId: "y" }), { ok: false, error: "forbidden" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "assign", currentAssigneeId: null }), { ok: false, error: "target" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "assign", currentAssigneeId: "x", targetId: "y" }), { ok: true, assigneeId: "y", noop: false });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "assign", currentAssigneeId: "y", targetId: "y" }), { ok: true, assigneeId: "y", noop: true });
});

test("setelah selesai penugasan terkunci untuk semua aksi dan peran", () => {
  for (const mode of ["take", "release", "assign"] as const) {
    assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, closed: true, mode, currentAssigneeId: "me", targetId: "y" }), { ok: false, error: "closed" });
  }
  assert.deepEqual(assignUi({ meId: "me", canManageOthers: true, currentAssigneeId: null, closed: true }), { canTake: false, canRelease: false, canAssign: false });
});

test("tombol yang tampil sesuai peran dan kepemilikan", () => {
  const u = (o: Partial<Parameters<typeof assignUi>[0]>) => assignUi({ meId: "me", canManageOthers: false, currentAssigneeId: null, closed: false, ...o });
  assert.deepEqual(u({}), { canTake: true, canRelease: false, canAssign: false });
  assert.deepEqual(u({ currentAssigneeId: "me" }), { canTake: false, canRelease: true, canAssign: false });
  assert.deepEqual(u({ currentAssigneeId: "x" }), { canTake: false, canRelease: false, canAssign: false });
  assert.deepEqual(u({ canManageOthers: true, currentAssigneeId: "x" }), { canTake: false, canRelease: false, canAssign: true });
  assert.deepEqual(u({ canManageOthers: true, currentAssigneeId: "me" }), { canTake: false, canRelease: true, canAssign: true });
});

test("status akhir dikenali", () => {
  assert.equal(isInquiryClosed("DELIVERED"), true);
  assert.equal(isInquiryClosed("PAID"), false);
  assert.equal(isClaimClosed("REJECTED"), true);
  assert.equal(isClaimClosed("IN_SERVICE"), false);
});

test("catatan dirapikan dan dibatasi", () => {
  assert.equal(cleanNote("   "), null);
  assert.equal(cleanNote("x".repeat(1001)), null);
  assert.equal(cleanNote("  halo\u0000 "), "halo");
});
