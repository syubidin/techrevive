import { test } from "node:test";
import assert from "node:assert/strict";
import { claimBlocker, claimCode, cleanIssue, warrantyOf, WARRANTY_DAYS } from "../src/lib/warranty.ts";
import { canClaimMove, claimNeedsReason, claimNext, isClaimOpen } from "../src/lib/claim-flow.ts";

const d = (s: string) => new Date(s);

test("garansi belum mulai sebelum barang diterima atau tanpa pembayaran", () => {
  assert.equal(warrantyOf({ deliveredAt: null, paidAt: d("2026-11-01") }).state, "none");
  assert.equal(warrantyOf({ deliveredAt: d("2026-11-01"), paidAt: null }).state, "none");
});

test("garansi aktif selama 30 hari sejak diterima, lalu berakhir", () => {
  const start = d("2026-11-01T00:00:00Z");
  const a = warrantyOf({ deliveredAt: start, paidAt: start }, d("2026-11-10T00:00:00Z"));
  assert.equal(a.state, "active");
  if (a.state === "active") assert.equal(a.daysLeft, WARRANTY_DAYS - 9);
  assert.equal(warrantyOf({ deliveredAt: start, paidAt: start }, d("2026-12-01T00:00:00Z")).state, "active");
  assert.equal(warrantyOf({ deliveredAt: start, paidAt: start }, d("2026-12-01T00:00:01Z")).state, "expired");
});

test("pengajuan klaim diblokir sesuai keadaan", () => {
  const act = warrantyOf({ deliveredAt: d("2026-11-01"), paidAt: d("2026-11-01") }, d("2026-11-05"));
  assert.equal(claimBlocker(act, 0, 0), null);
  assert.equal(claimBlocker(act, 1, 1), "open");
  assert.equal(claimBlocker(act, 0, 5), "limit");
  assert.equal(claimBlocker({ state: "none" }, 0, 0), "notStarted");
  assert.equal(claimBlocker({ state: "expired", startsAt: d("2026-01-01"), endsAt: d("2026-01-31") }, 0, 0), "expired");
});

test("keluhan divalidasi dan dibersihkan", () => {
  assert.equal(cleanIssue("pendek"), null);
  assert.equal(cleanIssue("x".repeat(1001)), null);
  assert.equal(cleanIssue("  Layar    berkedip\u0000 saat   dipakai  "), "Layar berkedip saat dipakai");
});

test("kode klaim berformat CL-YYMMDD-XXXX", () => {
  assert.match(claimCode(() => 0, d("2026-11-19T10:00:00Z")), /^CL-261119-AAAA$/);
  assert.match(claimCode((m) => m - 1, d("2026-11-19T10:00:00Z")), /^CL-261119-[A-Z2-9]{4}$/);
});

test("alur status klaim: hanya transisi sah, status akhir terkunci", () => {
  assert.equal(canClaimMove("SUBMITTED", "REVIEWING"), true);
  assert.equal(canClaimMove("SUBMITTED", "RESOLVED"), false);
  assert.equal(canClaimMove("READY", "RESOLVED"), true);
  for (const t of ["RESOLVED", "REJECTED", "CANCELLED"] as const) assert.deepEqual(claimNext(t), []);
  assert.equal(claimNeedsReason("REJECTED"), true);
  assert.equal(claimNeedsReason("APPROVED"), false);
  assert.equal(isClaimOpen("IN_SERVICE"), true);
  assert.equal(isClaimOpen("REJECTED"), false);
});
