import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSellPrice, computeProfit, meetsMinimumMargin, PricingError } from "../src/lib/pricing.ts";

test("margin persen dibulatkan ke atas Rp1.000", () => {
  assert.equal(computeSellPrice({ costPrice: 5_000_000, marginType: "PERCENT_BPS", marginValue: 1000 }), 5_500_000);
  assert.equal(computeSellPrice({ costPrice: 4_123_000, marginType: "PERCENT_BPS", marginValue: 1200 }), 4_618_000);
});

test("margin tetap", () => {
  assert.equal(computeSellPrice({ costPrice: 1_000_000, marginType: "FIXED", marginValue: 150_000 }), 1_150_000);
});

test("input tidak valid ditolak", () => {
  for (const bad of [0, -5, 1.5, Number.NaN]) {
    assert.throws(() => computeSellPrice({ costPrice: bad, marginType: "FIXED", marginValue: 0 }), PricingError);
  }
  assert.throws(() => computeSellPrice({ costPrice: 1000, marginType: "FIXED", marginValue: -1 }), PricingError);
});

test("overflow ditolak", () => {
  assert.throws(
    () => computeSellPrice({ costPrice: 1_999_999_999, marginType: "PERCENT_BPS", marginValue: 5000 }),
    (e: unknown) => e instanceof PricingError && e.code === "OVERFLOW",
  );
});

test("profit dan margin bps", () => {
  assert.deepEqual(computeProfit(5_500_000, 5_000_000, 50_000), { profit: 450_000, marginBps: 818 });
});

test("batas margin minimum", () => {
  assert.equal(meetsMinimumMargin(5_000_000, 5_000_000, 300), false);
  assert.equal(meetsMinimumMargin(5_500_000, 5_000_000, 300), true);
});
