import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, csvCell, ordersToCsv, parseRange, wibDay, type ReportOrder } from "../src/lib/reports.ts";

const o = (over: Partial<ReportOrder>): ReportOrder => ({ code: "TR-1", productName: "Laptop A", sku: "S1", category: "Laptop", paidAt: new Date("2026-11-10T03:00:00Z"), itemPrice: 5_000_000, itemCost: 4_500_000, shippingFee: 50_000, insuranceFee: 0, paymentFee: 10_000, total: 5_050_000, paymentMethod: "QRIS", ...over });

test("total: omzet, modal, laba, margin", () => {
  const r = buildReport([o({}), o({ code: "TR-2", sku: "S2", productName: "HP B", category: "HP", itemPrice: 2_000_000, itemCost: 1_800_000, paymentFee: 0, paymentMethod: "BANK_TRANSFER" })]);
  assert.equal(r.totals.orders, 2);
  assert.equal(r.totals.revenue, 7_000_000);
  assert.equal(r.totals.profit, 7_000_000 - 6_300_000 - 10_000);
  assert.equal(r.totals.marginBps, Math.round((690_000 / 7_000_000) * 10000));
  assert.equal(r.totals.shippingCollected, 100_000);
  assert.equal(r.byProduct[0].sku, "S1");
  assert.equal(r.byPayment.length, 2);
});

test("laporan kosong tidak membagi nol", () => {
  const r = buildReport([]);
  assert.deepEqual([r.totals.marginBps, r.totals.avgOrder, r.byDay.length], [0, 0, 0]);
});

test("pengelompokan harian memakai tanggal WIB", () => {
  assert.equal(wibDay(new Date("2026-11-10T17:30:00Z")), "2026-11-11"); // 00:30 WIB
  const r = buildReport([o({ paidAt: new Date("2026-11-10T16:59:00Z") }), o({ paidAt: new Date("2026-11-10T17:01:00Z") })]);
  assert.deepEqual(r.byDay.map((d) => d.day), ["2026-11-10", "2026-11-11"]);
});

test("rentang tanggal: valid, terbalik, mustahil, terlalu panjang", () => {
  const ok = parseRange("2026-11-01", "2026-11-14")!;
  assert.equal(ok.from.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.equal(ok.to.toISOString(), "2026-11-14T17:00:00.000Z");
  assert.equal(parseRange("2026-11-14", "2026-11-01"), null);
  assert.equal(parseRange("2026-02-31", "2026-03-01"), null);
  assert.equal(parseRange("2024-01-01", "2026-01-01"), null);
  assert.equal(parseRange(undefined, "2026-01-01"), null);
});

test("CSV: kutip dan netralkan injeksi rumus", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell(-5), "-5");
  const csv = ordersToCsv([o({ productName: "=cmd" })]);
  assert.ok(csv.startsWith("﻿Kode,") && csv.includes("'=cmd"));
});
