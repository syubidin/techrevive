import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeIdPhone, maskPhone } from "../src/lib/phone.ts";

test("berbagai format valid dinormalisasi", () => {
  for (const input of ["0812-3456-7890", "+62 812 3456 7890", "81234567890", "6281234567890"]) {
    assert.equal(normalizeIdPhone(input), "6281234567890", input);
  }
});

test("salah ketik +620", () => {
  assert.equal(normalizeIdPhone("+6208123456789"), "628123456789");
});

test("tidak valid", () => {
  for (const input of ["08123", "021 555 1234", "abc", "", "0812345678901234", "+1 415 555 0100"]) {
    assert.equal(normalizeIdPhone(input), null, input);
  }
});

test("mask", () => {
  assert.equal(maskPhone("6281234567890"), "6281****890");
});
