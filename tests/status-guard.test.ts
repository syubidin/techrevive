import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedTargets, checkStatusChange, type InquiryStatus } from "../src/lib/status-guard.ts";
import { planStockAdjustment } from "../src/lib/stock.ts";

const base = { role: "STAFF" as const, current: "QUOTED" as InquiryStatus, orderPaid: false };
const err = (over: Partial<Parameters<typeof checkStatusChange>[0]> & { target: InquiryStatus }) => checkStatusChange({ ...base, ...over });

test("tidak ada perubahan selalu boleh", () => {
  assert.equal(err({ target: "QUOTED" }), null);
});

test("status uang/pengiriman tidak bisa diatur dari form status, siapa pun perannya", () => {
  for (const role of ["STAFF", "OWNER", "DEVELOPER"] as const) {
    for (const target of ["AWAITING_PAYMENT", "PAID", "SHIPPED", "DELIVERED"] as const) {
      assert.match(err({ role, target }) ?? "", /form Order/, `${role} -> ${target}`);
    }
  }
});

test("Staff tidak bisa mengakali Lunas lewat form status", () => {
  assert.notEqual(err({ role: "STAFF", current: "CONTACTED", target: "PAID" }), null);
});

test("pesan ke supplier dan QC butuh pembayaran lunas", () => {
  assert.match(err({ current: "AWAITING_PAYMENT", target: "PROCURING" }) ?? "", /lunas/);
  assert.equal(err({ current: "PAID", orderPaid: true, target: "PROCURING" }), null);
  assert.equal(err({ current: "PROCURING", orderPaid: true, target: "RECEIVED_BY_US" }), null);
});

test("order yang berjalan tidak bisa mundur ke tahap penawaran", () => {
  assert.match(err({ current: "PAID", orderPaid: true, target: "QUOTED" }) ?? "", /berjalan/);
  assert.match(err({ current: "AWAITING_PAYMENT", target: "NEW" }) ?? "", /berjalan/);
});

test("order selesai tidak bisa diubah", () => {
  assert.match(err({ role: "DEVELOPER", current: "DELIVERED", orderPaid: true, target: "CANCELLED" }) ?? "", /selesai/);
});

test("membatalkan order berbayar hanya Owner/Developer", () => {
  assert.match(err({ role: "STAFF", current: "PAID", orderPaid: true, target: "CANCELLED" }) ?? "", /Owner atau Developer/);
  assert.equal(err({ role: "OWNER", current: "PAID", orderPaid: true, target: "CANCELLED" }), null);
  assert.equal(err({ role: "DEVELOPER", current: "PAID", orderPaid: true, target: "CANCELLED" }), null);
});

test("Staff boleh membatalkan inquiry yang belum dibayar", () => {
  assert.equal(err({ role: "STAFF", current: "CONTACTED", target: "CANCELLED" }), null);
});

test("membuka ulang batal/kedaluwarsa hanya Owner/Developer", () => {
  assert.notEqual(err({ role: "STAFF", current: "CANCELLED", target: "CONTACTED" }), null);
  assert.notEqual(err({ role: "STAFF", current: "EXPIRED", target: "QUOTED" }), null);
  assert.equal(err({ role: "OWNER", current: "EXPIRED", target: "QUOTED" }), null);
});

test("order berjalan tidak bisa berstatus kedaluwarsa", () => {
  assert.notEqual(err({ role: "OWNER", current: "PAID", orderPaid: true, target: "EXPIRED" }), null);
});

test("daftar pilihan dropdown mengikuti aturan", () => {
  const staff = allowedTargets({ role: "STAFF", current: "CONTACTED", orderPaid: false });
  assert.deepEqual(staff, ["NEW", "CONTACTED", "SUPPLIER_CHECKING", "QUOTED", "CANCELLED", "EXPIRED"]);
  for (const s of ["PAID", "SHIPPED", "DELIVERED", "AWAITING_PAYMENT"] as const) assert.equal(staff.includes(s), false, s);
  const paid = allowedTargets({ role: "OWNER", current: "PAID", orderPaid: true });
  assert.ok(paid.includes("PAID") && paid.includes("PROCURING") && paid.includes("CANCELLED"));
  assert.equal(paid.includes("QUOTED"), false);
});

test("stok diketahui: berkurang saat lunas, otomatis habis di 0", () => {
  assert.deepEqual(planStockAdjustment({ stockQty: 3, paidBefore: false, paidNow: true, autoApplied: false }), {
    action: "decrement", newQty: 2, markSoldOut: false, reopen: false, autoApplied: true, needsReview: false,
  });
  const last = planStockAdjustment({ stockQty: 1, paidBefore: false, paidNow: true, autoApplied: false });
  assert.equal(last.newQty, 0);
  assert.equal(last.markSoldOut, true);
});

test("stok tidak boleh negatif", () => {
  assert.equal(planStockAdjustment({ stockQty: 0, paidBefore: false, paidNow: true, autoApplied: false }).newQty, 0);
});

test("stok tidak diketahui: tidak menebak, minta ditinjau manual", () => {
  const p = planStockAdjustment({ stockQty: null, paidBefore: false, paidNow: true, autoApplied: false });
  assert.equal(p.action, "none");
  assert.equal(p.needsReview, true);
  assert.equal(p.markSoldOut, false);
  assert.equal(p.newQty, null);
});

test("simpan ulang order yang sudah lunas tidak mengurangi stok dua kali", () => {
  const p = planStockAdjustment({ stockQty: 2, paidBefore: true, paidNow: true, autoApplied: true });
  assert.equal(p.action, "none");
  assert.equal(p.newQty, 2);
});

test("pembayaran dibatalkan: stok dipulihkan hanya jika tadinya dikurangi otomatis", () => {
  const restore = planStockAdjustment({ stockQty: 0, paidBefore: true, paidNow: false, autoApplied: true });
  assert.equal(restore.action, "restore");
  assert.equal(restore.newQty, 1);
  assert.equal(restore.reopen, true);
  assert.equal(planStockAdjustment({ stockQty: null, paidBefore: true, paidNow: false, autoApplied: false }).action, "none");
});
