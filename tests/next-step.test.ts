import { test } from "node:test";
import assert from "node:assert/strict";
import { customerMessage, nextStep } from "../src/lib/next-step.ts";

test("langkah berikutnya mengikuti status", () => {
  const f = (status: string, hasOrder = false) => nextStep({ status, hasOrder });
  assert.equal(f("NEW"), "reply");
  assert.equal(f("SUPPLIER_CHECKING"), "reply");
  assert.equal(f("QUOTED"), "order");
  assert.equal(f("QUOTED", true), "pay");
  assert.equal(f("AWAITING_PAYMENT", true), "pay");
  assert.equal(f("PAID", true), "ship");
  assert.equal(f("RECEIVED_BY_US", true), "ship");
  assert.equal(f("SHIPPED", true), "deliver");
  assert.equal(f("DELIVERED", true), "done");
  assert.equal(f("CANCELLED"), "closed");
  assert.equal(f("EXPIRED"), "closed");
});

const ctx = { name: "Sari", code: "TR-261116-AB12", product: "ThinkPad T14", price: "Rp5.500.000", validUntil: "17 Nov 2026 15.00 WIB", trackUrl: "https://x.id/id/track", courier: null, trackingNumber: null, deliveredBy: null };

test("pesan penawaran memuat harga, masa berlaku, dan tanpa garansi", () => {
  const m = customerMessage("QUOTED", ctx);
  assert.match(m, /Rp5\.500\.000/);
  assert.match(m, /17 Nov 2026/);
  assert.match(m, /tanpa garansi/);
});

test("pesan dikirim menyebut kurir+resi atau petugas pengantar", () => {
  assert.match(customerMessage("SHIPPED", { ...ctx, courier: "JNE", trackingNumber: "JP1" }), /JNE \(resi JP1\)/);
  assert.match(customerMessage("SHIPPED", { ...ctx, deliveredBy: "Budi" }), /Diantar oleh: Budi/);
});

test("setiap pesan menyertakan tautan pelacakan", () => {
  for (const s of ["QUOTED", "AWAITING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "NEW"]) assert.match(customerMessage(s, ctx), /track/);
});
