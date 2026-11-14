import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDelivery, shouldAdvance, type DeliveryInput } from "../src/lib/order-flow.ts";

const base: DeliveryInput = { method: "OWN_TEAM", paid: false, dispatched: false, delivered: false, courier: null, trackingNumber: null, deliveredBy: null };

test("belum ada apa-apa: menunggu pembayaran", () => {
  assert.equal(resolveDelivery(base).status, "AWAITING_PAYMENT");
  assert.equal(resolveDelivery({ ...base, method: "COURIER" }).status, "AWAITING_PAYMENT");
});

test("lunas saja: status Lunas", () => {
  assert.equal(resolveDelivery({ ...base, paid: true }).status, "PAID");
});

test("antar tim boleh berangkat sebelum lunas (bayar saat serah terima)", () => {
  const r = resolveDelivery({ ...base, dispatched: true, deliveredBy: "Budi" });
  assert.equal(r.error, undefined);
  assert.equal(r.status, "SHIPPED");
});

test("antar tim wajib nama petugas", () => {
  assert.match(resolveDelivery({ ...base, dispatched: true })!.error ?? "", /petugas/);
});

test("diterima wajib lunas, walau antar tim", () => {
  const r = resolveDelivery({ ...base, dispatched: true, delivered: true, deliveredBy: "Budi" });
  assert.match(r.error ?? "", /lunas/);
});

test("diterima otomatis berarti sudah dikirim", () => {
  const r = resolveDelivery({ ...base, paid: true, delivered: true, deliveredBy: "Budi" });
  assert.equal(r.error, undefined);
  assert.equal(r.dispatched, true);
  assert.equal(r.status, "DELIVERED");
});

test("kurir wajib lunas sebelum dikirim", () => {
  const r = resolveDelivery({ ...base, method: "COURIER", dispatched: true, courier: "JNE" });
  assert.match(r.error ?? "", /lunas/);
});

test("kurir wajib nama kurir", () => {
  const r = resolveDelivery({ ...base, method: "COURIER", paid: true, dispatched: true });
  assert.match(r.error ?? "", /kurir/);
});

test("kurir dengan nomor resi dianggap sudah dikirim", () => {
  const r = resolveDelivery({ ...base, method: "COURIER", paid: true, courier: "JNE", trackingNumber: "JP123" });
  assert.equal(r.error, undefined);
  assert.equal(r.status, "SHIPPED");
});

test("nomor resi pada antar tim tidak mengubah status", () => {
  assert.equal(resolveDelivery({ ...base, paid: true, trackingNumber: "JP123" }).status, "PAID");
});

test("status hanya maju, tidak pernah mundur", () => {
  assert.equal(shouldAdvance("QUOTED", "AWAITING_PAYMENT"), true);
  assert.equal(shouldAdvance("PAID", "AWAITING_PAYMENT"), false);
  assert.equal(shouldAdvance("SHIPPED", "SHIPPED"), false);
  assert.equal(shouldAdvance("SHIPPED", "DELIVERED"), true);
  assert.equal(shouldAdvance("CANCELLED", "PAID"), false);
  assert.equal(shouldAdvance("EXPIRED", "PAID"), false);
});
