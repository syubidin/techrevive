import { test } from "node:test";
import assert from "node:assert/strict";
import { cheapestIndexes, COMPARE_MAX, parseSlugs, rowDiffers, toggleSlug } from "../src/lib/compare.ts";

test("slug dari URL dibersihkan, unik, dibatasi", () => {
  assert.deepEqual(parseSlugs("a-1, B-2 ,a-1,../x,<script>"), ["a-1", "b-2"]);
  assert.deepEqual(parseSlugs(["a,b", "c,d,e,f"]), ["a", "b", "c", "d"]);
  assert.deepEqual(parseSlugs(null), []);
  assert.equal(parseSlugs("a,b,c,d,e").length, COMPARE_MAX);
});

test("toggle menambah, menghapus, dan menolak saat penuh", () => {
  assert.deepEqual(toggleSlug([], "a"), { slugs: ["a"], added: true, full: false });
  assert.deepEqual(toggleSlug(["a"], "a"), { slugs: [], added: false, full: false });
  const full = ["a", "b", "c", "d"];
  assert.deepEqual(toggleSlug(full, "e"), { slugs: full, added: false, full: true });
  assert.equal(toggleSlug(full, "d").slugs.length, 3);
});

test("baris berbeda terdeteksi, kosong dihitung berbeda dari terisi", () => {
  assert.equal(rowDiffers([16, 16, 16]), false);
  assert.equal(rowDiffers([16, 8]), true);
  assert.equal(rowDiffers(["i5", null]), true);
  assert.equal(rowDiffers([null, undefined, ""]), false);
});

test("harga terendah ditandai, seri semua ditandai, tunggal tidak", () => {
  assert.deepEqual(cheapestIndexes([5, 3, 9]), [1]);
  assert.deepEqual(cheapestIndexes([3, 3]), [0, 1]);
  assert.deepEqual(cheapestIndexes([3]), []);
});

import { bestIndexes, scoreOf, winCounts } from "../src/lib/compare.ts";

test("bestIndexes: tertinggi menang, seri menang bersama, seri total tanpa tanda", () => {
  assert.deepEqual(bestIndexes([8, 16, 16]), [1, 2]);
  assert.deepEqual(bestIndexes([8, 8]), []);
  assert.deepEqual(bestIndexes([5, null]), []);
  assert.deepEqual(bestIndexes([null, 4, 2]), [1]);
  assert.deepEqual(bestIndexes([3, 1, 2], "lower"), [1]);
});
test("scoreOf: grade, kondisi, boolean, angka", () => {
  assert.ok(scoreOf("grade", "A")! > scoreOf("grade", "B")!);
  assert.ok(scoreOf("condition", "REFURBISHED")! > scoreOf("condition", "USED")!);
  assert.equal(scoreOf("boolean", true), 1);
  assert.equal(scoreOf("boolean", "false"), 0);
  assert.equal(scoreOf("number", "16"), 16);
  assert.equal(scoreOf("number", "abc"), null);
  assert.equal(scoreOf("grade", null), null);
});
test("winCounts menjumlahkan kemenangan per produk", () => {
  assert.deepEqual(winCounts([[0], [0, 1], undefined, []], 3), [2, 1, 0]);
});
