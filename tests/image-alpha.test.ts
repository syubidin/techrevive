import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAlpha, sniffImage } from "../src/lib/image-sniff.ts";

const png = (colorType: number, extra: number[] = []) => {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const ihdr = [0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, colorType, 0, 0, 0, 0, 0, 0, 0];
  return new Uint8Array([...sig, ...ihdr, ...extra, 0, 0, 0, 0, 0x49, 0x44, 0x41, 0x54, 0, 0, 0, 0]);
};
const webp = (fourcc: string, flagsByte: number) => {
  const b = new Uint8Array(32);
  b.set([0x52, 0x49, 0x46, 0x46], 0); b.set([0x57, 0x45, 0x42, 0x50], 8);
  b.set([...fourcc].map((c) => c.charCodeAt(0)), 12);
  if (fourcc === "VP8X") b[20] = flagsByte; else b[24] = flagsByte;
  return b;
};

test("PNG RGBA dan Gray+Alpha transparan; RGB dan Gray tidak", () => {
  for (const [ct, expected] of [[6, true], [4, true], [2, false], [0, false]] as const) {
    const b = png(ct); assert.equal(hasAlpha(b, sniffImage(b)!), expected, `colorType ${ct}`);
  }
});
test("PNG palet dengan chunk tRNS dianggap transparan", () => {
  const b = png(3, [0, 0, 0, 1, 0x74, 0x52, 0x4e, 0x53, 0, 0, 0, 0, 0]);
  assert.equal(hasAlpha(b, sniffImage(b)!), true);
  const plain = png(3); assert.equal(hasAlpha(plain, sniffImage(plain)!), false);
});
test("WebP: VP8X bendera alpha, VP8L alpha dipakai, VP8 lossy tidak", () => {
  assert.equal(hasAlpha(webp("VP8X", 0x10), sniffImage(webp("VP8X", 0x10))!), true);
  assert.equal(hasAlpha(webp("VP8X", 0x00), sniffImage(webp("VP8X", 0x00))!), false);
  assert.equal(hasAlpha(webp("VP8L", 0x10), sniffImage(webp("VP8L", 0x10))!), true);
  assert.equal(hasAlpha(webp("VP8 ", 0x10), sniffImage(webp("VP8 ", 0x10))!), false);
});
test("JPEG tidak pernah transparan", () => {
  const b = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(hasAlpha(b, sniffImage(b)!), false);
});
