import { test } from "node:test";
import assert from "node:assert/strict";
import { lockDurationMs, shouldLock } from "../src/lib/login-policy.ts";

test("durasi kunci naik bertahap", () => {
  assert.equal(lockDurationMs(0), 0);
  assert.equal(lockDurationMs(4), 0);
  assert.equal(lockDurationMs(5), 15 * 60_000);
  assert.equal(lockDurationMs(9), 15 * 60_000);
  assert.equal(lockDurationMs(10), 60 * 60_000);
  assert.equal(lockDurationMs(15), 6 * 60 * 60_000);
  assert.equal(lockDurationMs(99), 24 * 60 * 60_000);
});

test("kunci baru hanya pada kelipatan 5", () => {
  assert.deepEqual([4, 5, 6, 9, 10, 11, 15].map(shouldLock), [false, true, false, false, true, false, true]);
});
