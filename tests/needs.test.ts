import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFinderParams, sanitizeAnswers } from "../src/lib/needs.ts";

const q = (a: Parameters<typeof buildFinderParams>[0]) => Object.fromEntries(new URLSearchParams(buildFinderParams(a)));

test("kuliah + laptop + 3-6 jt + hemat", () => {
  assert.deepEqual(q({ purpose: "study", device: "laptop", budget: "3to6", priority: "cheap" }), {
    category: "laptop", minPrice: "3000000", maxPrice: "6000000", "s.ram_gb.min": "8", sort: "price_asc",
  });
});

test("gaming laptop meminta GPU dedicated dan RAM 16", () => {
  const r = q({ purpose: "gaming", device: "laptop" });
  assert.equal(r["s.ram_gb.min"], "16");
  assert.equal(r["s.dedicated_gpu"], "1");
});

test("tanpa memilih perangkat: tidak ada kategori dan tidak ada spek", () => {
  const r = q({ purpose: "creative", device: "any", budget: "gt10", priority: "mint" });
  assert.equal(r.category, undefined);
  assert.equal(Object.keys(r).some((k) => k.startsWith("s.")), false);
  assert.equal(r.minPrice, "10000000");
  assert.equal(r.maxPrice, undefined);
  assert.equal(r.grade, "A");
});

test("fleksibel tanpa batas harga; baterai dan performa", () => {
  assert.deepEqual(q({ budget: "flex", priority: "battery" }), { battery: "80" });
  assert.deepEqual(q({ priority: "performance" }), { grade: "A,B" });
});

test("kategori tanpa aturan spek (aksesori/tablet) hanya memakai kategori dan harga", () => {
  assert.deepEqual(q({ purpose: "study", device: "tablet", budget: "lt3" }), { category: "tablet", maxPrice: "3000000" });
});

test("masukan tidak valid dibuang (anti injeksi)", () => {
  assert.deepEqual(sanitizeAnswers({ purpose: "hack", device: "../etc", budget: "x", priority: 5 }), {});
  assert.deepEqual(sanitizeAnswers(null), {});
  assert.deepEqual(sanitizeAnswers("str"), {});
  assert.equal(buildFinderParams({ device: "a&b=c" } as never), "");
  assert.equal(sanitizeAnswers({ device: "Laptop" }).device, undefined); // huruf besar ditolak (slug huruf kecil)
});
