import { test } from "node:test";
import assert from "node:assert/strict";
import { isIdleExpired, lastActivity, needsTouch, SESSION_IDLE_SEC, SESSION_TOUCH_SEC, SESSION_PING_SEC } from "../src/lib/session-policy.ts";

test("sesi mati hanya setelah melewati batas diam", () => {
  assert.equal(isIdleExpired(1000, 1000 + SESSION_IDLE_SEC), false);
  assert.equal(isIdleExpired(1000, 1000 + SESSION_IDLE_SEC + 1), true);
});

test("cap aktivitas diperbarui terbatas (throttle)", () => {
  assert.equal(needsTouch(1000, 1000 + SESSION_TOUCH_SEC - 1), false);
  assert.equal(needsTouch(1000, 1000 + SESSION_TOUCH_SEC), true);
});

test("token lama tanpa la memakai iat, tanpa keduanya dianggap sudah lama", () => {
  assert.equal(lastActivity({ la: 50, iat: 10 }), 50);
  assert.equal(lastActivity({ iat: 10 }), 10);
  assert.equal(lastActivity({}), 0);
  assert.equal(lastActivity({ la: "x" }), 0);
});

test("ping browser lebih sering daripada batas diam", () => {
  assert.ok(SESSION_PING_SEC * 2 < SESSION_IDLE_SEC);
});
