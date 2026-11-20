import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNote, decideAssignment } from "../src/lib/assignment.ts";

const base = { meId: "me", canManageOthers: false };

test("mengambil: bebas jika belum ada penanggung jawab, ditolak jika milik orang lain", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: null }), { ok: true, assigneeId: "me", noop: false });
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: "me" }), { ok: true, assigneeId: "me", noop: true });
  assert.deepEqual(decideAssignment({ ...base, mode: "take", currentAssigneeId: "x" }), { ok: false, error: "taken" });
});

test("pengelola boleh mengambil alih", () => {
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "take", currentAssigneeId: "x" }), { ok: true, assigneeId: "me", noop: false });
});

test("melepas: hanya milik sendiri, kecuali pengelola", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: "me" }), { ok: true, assigneeId: null, noop: false });
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: "x" }), { ok: false, error: "forbidden" });
  assert.deepEqual(decideAssignment({ ...base, mode: "release", currentAssigneeId: null }), { ok: true, assigneeId: null, noop: true });
  assert.equal(decideAssignment({ ...base, canManageOthers: true, mode: "release", currentAssigneeId: "x" }).ok, true);
});

test("menugaskan orang lain butuh izin dan tujuan", () => {
  assert.deepEqual(decideAssignment({ ...base, mode: "assign", currentAssigneeId: null, targetId: "y" }), { ok: false, error: "forbidden" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "assign", currentAssigneeId: null }), { ok: false, error: "target" });
  assert.deepEqual(decideAssignment({ ...base, canManageOthers: true, mode: "assign", currentAssigneeId: null, targetId: "y" }), { ok: true, assigneeId: "y", noop: false });
});

test("catatan dirapikan dan dibatasi", () => {
  assert.equal(cleanNote("   "), null);
  assert.equal(cleanNote("x".repeat(1001)), null);
  assert.equal(cleanNote("  halo\u0000 "), "halo");
});
