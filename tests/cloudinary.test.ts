import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudinaryConfig, contentId, deliveryUrl, publicIdFromUrl, signParams } from "../src/lib/cloudinary.ts";

test("tanda tangan Cloudinary sesuai contoh dokumentasi resmi", () => {
  const sig = signParams({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 }, "abcd");
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});
test("parameter diurutkan abjad sehingga urutan input tidak berpengaruh", () => {
  assert.equal(signParams({ b: 1, a: 2 }, "s"), signParams({ a: 2, b: 1 }, "s"));
});
test("konfigurasi null bila ada yang kosong", () => {
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "y" }), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "y", CLOUDINARY_API_SECRET: "z" })?.folder, "techrevive");
});

const cfg = { cloudName: "demo", folder: "techrevive" };
test("public_id dari URL milik kita, termasuk yang bertransformasi dan berversi", () => {
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v123/techrevive/products/abc.jpg", cfg), "techrevive/products/abc");
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/techrevive/brands/xyz.png", cfg), "techrevive/brands/xyz");
});
test("aset bukan milik kita tidak pernah dianggap boleh dihapus", () => {
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/lain/image/upload/v1/techrevive/products/a.jpg", cfg), null);
  assert.equal(publicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v1/folder-lain/a.jpg", cfg), null);
  assert.equal(publicIdFromUrl("https://cdn.example.com/techrevive/products/a.jpg", cfg), null);
  assert.equal(publicIdFromUrl("bukan url", cfg), null);
});
test("isi file sama menghasilkan id sama (tidak menggandakan penyimpanan)", () => {
  assert.equal(contentId(new Uint8Array([1, 2, 3])), contentId(new Uint8Array([1, 2, 3])));
  assert.notEqual(contentId(new Uint8Array([1, 2, 3])), contentId(new Uint8Array([1, 2, 4])));
});
test("deliveryUrl hanya menyentuh URL Cloudinary", () => {
  assert.equal(deliveryUrl("https://res.cloudinary.com/demo/image/upload/v1/a.png", "w_100"), "https://res.cloudinary.com/demo/image/upload/w_100/v1/a.png");
  assert.equal(deliveryUrl("https://cdn.x.com/a.png", "w_100"), "https://cdn.x.com/a.png");
});
