import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin, webpName } from "../src/lib/image-client.ts";

test("fitWithin memperkecil sisi terpanjang dan tidak memperbesar", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1600), { w: 1600, h: 1200 });
  assert.deepEqual(fitWithin(3000, 4000, 1600), { w: 1200, h: 1600 });
  assert.deepEqual(fitWithin(800, 600, 1600), { w: 800, h: 600 });
  assert.deepEqual(fitWithin(10000, 1, 1600), { w: 1600, h: 1 });
  assert.deepEqual(fitWithin(0, 100, 1600), { w: 0, h: 0 });
});

test("webpName mengganti ekstensi", () => {
  assert.equal(webpName("foto.JPG"), "foto.webp");
  assert.equal(webpName("a.b.png"), "a.b.webp");
  assert.equal(webpName("tanpa-ekstensi"), "tanpa-ekstensi.webp");
  assert.equal(webpName(".png"), "gambar.webp");
});
