import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteShipping, normalizeCity, ShippingError, type ShippingRate } from "../src/lib/shipping.ts";

const rates: ShippingRate[] = [
  { zone: "Jakarta", cities: ["jakarta selatan", "jakarta pusat"], baseFee: 15_000, perKgFee: 5_000, minDays: 1, maxDays: 2 },
  { zone: "Bodetabek", cities: ["depok", "bekasi"], baseFee: 20_000, perKgFee: 7_000, minDays: 1, maxDays: 3 },
];

test("normalisasi nama kota", () => {
  assert.equal(normalizeCity("  Kota Depok "), "depok");
  assert.equal(normalizeCity("Kab. Bekasi"), "bekasi");
});

test("berat dibulatkan ke atas + asuransi", () => {
  const q = quoteShipping(rates, { city: "Jakarta Selatan", actualWeightGram: 1200, declaredValue: 5_000_000 });
  assert.equal(q.chargeableKg, 2);
  assert.equal(q.shippingFee, 20_000);
  assert.equal(q.insuranceFee, 10_000);
  assert.equal(q.total, 30_000);
});

test("berat volumetrik dipakai jika lebih besar", () => {
  const q = quoteShipping(rates, {
    city: "depok",
    actualWeightGram: 500,
    dims: { lengthCm: 40, widthCm: 30, heightCm: 10 },
    declaredValue: 0,
  });
  assert.equal(q.chargeableKg, 2);
  assert.equal(q.shippingFee, 27_000);
});

test("di luar area ditolak", () => {
  assert.throws(
    () => quoteShipping(rates, { city: "Surabaya", actualWeightGram: 1000, declaredValue: 1 }),
    (e: unknown) => e instanceof ShippingError && e.code === "OUT_OF_AREA",
  );
});

test("input tidak valid", () => {
  assert.throws(() => quoteShipping(rates, { city: "depok", actualWeightGram: 0, declaredValue: 1 }), ShippingError);
});
