import { test } from "node:test";
import assert from "node:assert/strict";
import { cloudinaryConfig, signParams } from "../src/lib/cloudinary.ts";

test("tanda tangan Cloudinary sesuai contoh dokumentasi resmi", () => {
  const sig = signParams({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 }, "abcd");
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});
test("parameter diurutkan abjad sehingga urutan input tidak berpengaruh", () => {
  assert.equal(signParams({ b: 1, a: 2 }, "s"), signParams({ a: 2, b: 1 }, "s"));
});
test("konfigurasi null bila ada yang kosong", () => {
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "y" }), null);
  assert.equal(cloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "x", CLOUDINARY_API_KEY: "y", CLOUDINARY_API_SECRET: "z" })?.folder, "techrevive/products");
});
