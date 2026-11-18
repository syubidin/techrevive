import { test } from "node:test";
import assert from "node:assert/strict";
import { getClientIp } from "../src/lib/client-ip.ts";

test("memakai entri terakhir X-Forwarded-For (anti spoofing)", () => {
  delete process.env.TRUST_CLOUDFLARE;
  assert.equal(getClientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" })), "9.9.9.9");
});

test("CF-Connecting-IP diabaikan kecuali dipercaya", () => {
  delete process.env.TRUST_CLOUDFLARE;
  assert.equal(getClientIp(new Headers({ "cf-connecting-ip": "2.2.2.2" })), "unknown");
  process.env.TRUST_CLOUDFLARE = "1";
  assert.equal(getClientIp(new Headers({ "cf-connecting-ip": "2.2.2.2", "x-forwarded-for": "5.5.5.5" })), "2.2.2.2");
  delete process.env.TRUST_CLOUDFLARE;
});

test("tanpa X-Forwarded-For memakai X-Real-IP, jika tidak ada baru unknown", () => {
  delete process.env.TRUST_CLOUDFLARE;
  assert.equal(getClientIp(new Headers({ "x-real-ip": "4.4.4.4" })), "4.4.4.4");
  assert.equal(getClientIp(new Headers()), "unknown");
});
