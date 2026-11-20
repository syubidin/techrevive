import { test } from "node:test";
import assert from "node:assert/strict";
import { followUpPresets, parseFollowUp, toWibInput } from "../src/lib/follow-up.ts";

const now = new Date("2026-11-20T03:00:00Z"); // 10:00 WIB

test("kosong menghapus jadwal; format salah ditolak", () => {
  assert.deepEqual(parseFollowUp("  ", now), { ok: true, date: null });
  assert.equal(parseFollowUp("besok", now).ok, false);
  assert.equal(parseFollowUp("2026-13-45T99:99", now).ok, false);
});

test("jadwal harus di masa depan dan maksimal 1 tahun", () => {
  assert.equal(parseFollowUp("2026-11-20T09:00", now).ok, false);
  const ok = parseFollowUp("2026-11-21T09:00", now);
  assert.ok(ok.ok && ok.date?.toISOString() === "2026-11-21T02:00:00.000Z");
  assert.equal(parseFollowUp("2028-01-01T09:00", now).ok, false);
});

test("pilihan cepat pukul 09:00 WIB dan bolak-balik dengan input", () => {
  const p = followUpPresets(now);
  assert.deepEqual(p.map((x) => x.value), ["2026-11-21T09:00", "2026-11-23T09:00", "2026-11-27T09:00"]);
  const parsed = parseFollowUp(p[0].value, now);
  assert.ok(parsed.ok && toWibInput(parsed.date) === p[0].value);
  assert.equal(toWibInput(null), "");
});

test("pilihan cepat lewat tengah malam WIB tetap benar", () => {
  const late = new Date("2026-11-20T18:00:00Z"); // 01:00 WIB tanggal 21
  assert.equal(followUpPresets(late)[0].value, "2026-11-22T09:00");
});
