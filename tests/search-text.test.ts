import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeLike, normalizeQuery, tokenize } from "../src/lib/search-text.ts";

test("kata kunci dinormalkan: huruf kecil, simbol berbahaya dibuang, spasi dirapatkan", () => {
  assert.equal(normalizeQuery("  ThinkPad   T14 "), "thinkpad t14");
  assert.equal(normalizeQuery("'; DROP TABLE \"Product\";--"), "drop table product --");
  assert.equal(normalizeQuery("%%__"), "");
  assert.equal(normalizeQuery("x".repeat(200)).length, 60);
});

test("tokenisasi: unik, dibatasi, kata satu huruf dibuang bila ada kata lain", () => {
  assert.deepEqual(tokenize("lenovo lenovo t14"), ["lenovo", "t14"]);
  assert.deepEqual(tokenize("a lenovo"), ["lenovo"]);
  assert.deepEqual(tokenize("a"), ["a"]);
  assert.equal(tokenize("a1 b2 c3 d4 e5 f6 g7 h8").length, 6);
});

test("karakter khusus LIKE di-escape", () => {
  assert.equal(escapeLike("50%_a\\b"), "50\\%\\_a\\\\b");
});

test("token tanpa huruf/angka diabaikan", () => {
  assert.deepEqual(tokenize("drop --  table"), ["drop", "table"]);
});
