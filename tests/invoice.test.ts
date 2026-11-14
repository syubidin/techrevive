import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceLines, invoiceNumber, isInvoiceToken, newInvoiceToken } from "../src/lib/invoice.ts";

test("token invoice acak, panjang tetap, tervalidasi", () => {
  const a = newInvoiceToken(), b = newInvoiceToken();
  assert.notEqual(a, b);
  assert.ok(isInvoiceToken(a) && a.length === 32);
  for (const bad of ["", "short", "a".repeat(31), "a".repeat(33), "../".repeat(11), `${"a".repeat(31)}!`]) assert.equal(isInvoiceToken(bad), false);
});

test("nomor invoice dari kode inquiry", () => assert.equal(invoiceNumber("TR-261114-ABCD"), "INV-261114-ABCD"));

test("rincian menyembunyikan biaya 0 dan menjumlah total", () => {
  const L = { item: "Barang", shipping: "Ongkir", insurance: "Asuransi" };
  assert.deepEqual(invoiceLines({ itemPrice: 5_000_000, shippingFee: 0, insuranceFee: 0 }, L), { lines: [{ label: "Barang", amount: 5_000_000 }], total: 5_000_000 });
  assert.equal(invoiceLines({ itemPrice: 5_000_000, shippingFee: 50_000, insuranceFee: 10_000 }, L).total, 5_060_000);
});
