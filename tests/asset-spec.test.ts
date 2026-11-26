import { test } from "node:test";
import assert from "node:assert/strict";
import { ASSET_SPECS, checkAsset, imageSize } from "../src/lib/asset-spec.ts";

const spec = { key: "x", w: 800, h: 600, maxKb: 70, use: "t", themed: true };

test("key aset unik dan rasio masuk akal", () => {
  const keys = ASSET_SPECS.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const s of ASSET_SPECS) assert.ok(s.w >= 640 && s.h >= 400 && s.maxKb > 0, s.key);
});

test("ukuran PNG dibaca dari header", () => {
  const b = new Uint8Array(32);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  b.set([0, 0, 3, 32], 16); // 800
  b.set([0, 0, 2, 88], 20); // 600
  assert.deepEqual(imageSize(b), { w: 800, h: 600 });
});

test("ukuran WebP VP8X dan VP8L dibaca", () => {
  const x = new Uint8Array(40);
  x.set([...Buffer.from("RIFF")], 0); x.set([...Buffer.from("WEBP")], 8); x.set([...Buffer.from("VP8X")], 12);
  x.set([0x1f, 0x03, 0], 24); x.set([0x57, 0x02, 0], 27); // 800x600 (nilai-1)
  assert.deepEqual(imageSize(x), { w: 800, h: 600 });
  const l = new Uint8Array(40);
  l.set([...Buffer.from("RIFF")], 0); l.set([...Buffer.from("WEBP")], 8); l.set([...Buffer.from("VP8L")], 12);
  const w = 799, h = 599;
  l[21] = w & 0xff; l[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6); l[23] = (h >> 2) & 0xff; l[24] = (h >> 10) & 0x0f;
  assert.deepEqual(imageSize(l), { w: 800, h: 600 });
});

test("format tidak dikenal menghasilkan null", () => {
  assert.equal(imageSize(new Uint8Array(50)), null);
});

test("pemeriksaan: aman, kurang tajam, rasio beda, terlalu besar", () => {
  assert.deepEqual(checkAsset(spec, { w: 800, h: 600 }, 50_000), []);
  assert.deepEqual(checkAsset(spec, { w: 1600, h: 1200 }, 50_000), []); // lebih besar boleh
  assert.match(checkAsset(spec, { w: 400, h: 300 }, 10_000)[0], /kurang tajam/);
  assert.ok(checkAsset(spec, { w: 800, h: 800 }, 10_000).some((m) => /rasio/.test(m)));
  assert.ok(checkAsset(spec, { w: 800, h: 600 }, 200_000).some((m) => /melebihi/.test(m)));
  assert.match(checkAsset(spec, null, 10)[0], /tidak dikenali/);
  assert.deepEqual(checkAsset(spec, null, 10_000, true), []); // SVG
});
