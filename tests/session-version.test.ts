import { test } from "node:test";
import assert from "node:assert/strict";
import { isSessionCurrent, normalizeSv } from "../src/lib/session-version.ts";

test("versi sama berlaku, versi berbeda diputus", () => {
  assert.equal(isSessionCurrent(0, 0), true);
  assert.equal(isSessionCurrent(2, 2), true);
  assert.equal(isSessionCurrent(1, 2), false);
  assert.equal(isSessionCurrent(3, 2), false);
});

test("token lama tanpa sv dianggap versi 0 (tidak memaksa logout saat deploy)", () => {
  assert.equal(isSessionCurrent(undefined, 0), true);
  assert.equal(isSessionCurrent(undefined, 1), false);
});

test("nilai tidak wajar dinormalkan ke 0", () => {
  for (const v of ["1", -1, 1.5, null, NaN]) assert.equal(normalizeSv(v), 0);
});
