import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseNumber, templateCsv, validateImport, type ImportContext } from "../src/lib/product-import.ts";

const ctx: ImportContext = {
  categories: [{ id: "c1", slug: "laptop", nameId: "Laptop", nameEn: "Laptop", specs: [{ key: "ram_gb", type: "NUMBER", options: [] }, { key: "cpu_family", type: "ENUM", options: ["i5", "i7"] }, { key: "storage_gb", type: "NUMBER", options: [] }] }],
  brands: [{ id: "b1", name: "Lenovo" }],
  suppliers: [],
  existingSkus: new Set(["TR-LTP-00001"]),
  minMarginBps: 300,
};
const H = "nama_id;kategori;merk;harga_modal;margin_persen;spek;status;grade;foto_url;sku;stok";
const run = (...rows: string[]) => validateImport(parseCsv([H, ...rows].join("\n")), ctx);

test("parser CSV: titik koma, koma, kutip, BOM, baris kosong", () => {
  assert.deepEqual(parseCsv("﻿a;b\n1;2\n\n"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi"""\n'), [["a", "b"], ["x, y", 'say "hi"']]);
  assert.deepEqual(parseCsv("a;b\r\n1;\"2\n3\"\r\n"), [["a", "b"], ["1", "2\n3"]]);
});

test("parseNumber memahami format Indonesia dan internasional", () => {
  assert.equal(parseNumber("5.500.000"), 5500000);
  assert.equal(parseNumber("Rp 5,500,000"), 5500000);
  assert.equal(parseNumber("12,5"), 12.5);
  assert.equal(parseNumber("1500000"), 1500000);
  assert.equal(parseNumber(""), null);
  assert.ok(Number.isNaN(parseNumber("abc")));
});

test("template CSV bisa dibaca kembali dan lolos validasi struktur", () => {
  const m = parseCsv(templateCsv());
  assert.equal(m.length, 3);
  const r = validateImport(m, { ...ctx, categories: [...ctx.categories, { id: "c2", slug: "smartphone", nameId: "Smartphone", nameEn: "Smartphone", specs: [] }] });
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.products.length, 2);
});

test("baris valid: harga dihitung dari modal+margin dibulatkan Rp1.000, merk baru dilaporkan", () => {
  const r = run('Lenovo T14;Laptop;Lenovo;5000000;12;"ram_gb=16; cpu_family=i5";DRAFT;;;;', "Dell 7490;laptop;Dell;4000000;;;;;;;");
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  assert.equal(r.products[0].sellPrice, 5600000);
  assert.deepEqual(r.products[0].attributes, { ram_gb: 16, cpu_family: "i5" });
  assert.equal(r.products[0].brandId, "b1");
  assert.deepEqual(r.newBrands, ["Dell"]);
  assert.equal(r.products[1].sellPrice, 4400000); // margin default 10%
});

test("semua-atau-tidak-sama-sekali: kesalahan dilaporkan dengan nomor baris Excel", () => {
  const r = run("Bagus;Laptop;Lenovo;5000000;10;;;;;;;", "Salah;Tablet;Lenovo;abc;10;;;;;;;");
  assert.equal(r.products.length, 1);
  assert.ok(r.errors.every((e) => e.row === 3));
  assert.ok(r.errors.some((e) => /kategori/.test(e.message)));
  assert.ok(r.errors.some((e) => /harga_modal/.test(e.message)));
});

test("spek tidak dikenal atau nilai pilihan salah ditolak", () => {
  assert.match(run("X Laptop;Laptop;Lenovo;5000000;10;gpu=rtx;;;;;;").errors[0].message, /gpu/);
  assert.match(run("X Laptop;Laptop;Lenovo;5000000;10;cpu_family=i9;;;;;;").errors[0].message, /salah satu/);
});

test("TERBIT wajib grade dan foto; foto harus https", () => {
  const msgs = run("X Laptop;Laptop;Lenovo;5000000;10;;TERBIT;;;;;").errors.map((e) => e.message).join("|");
  assert.match(msgs, /foto/); assert.match(msgs, /grade/);
  assert.equal(run("X Laptop;Laptop;Lenovo;5000000;10;;TERBIT;A;https://cdn.x/a.jpg;;;").errors.length, 0);
  assert.match(run("X Laptop;Laptop;Lenovo;5000000;10;;DRAFT;;http://x/a.jpg;;;").errors[0].message, /https/);
});

test("sku: duplikat dengan database atau di dalam file ditolak", () => {
  assert.match(run("X Laptop;Laptop;Lenovo;5000000;10;;;;;TR-LTP-00001;").errors[0].message, /sudah dipakai/);
  const r = run("A Laptop;Laptop;Lenovo;5000000;10;;;;;NEW-001;", "B Laptop;Laptop;Lenovo;5000000;10;;;;;NEW-001;");
  assert.match(r.errors[0].message, /dobel/);
});

test("margin di bawah minimum ditolak; stok 0 otomatis habis", () => {
  assert.match(run("X Laptop;Laptop;Lenovo;5000000;1;;;;;;").errors[0].message, /margin/);
  assert.equal(run("X Laptop;Laptop;Lenovo;5000000;10;;;;;;0").products[0].availability, "SOLD_OUT");
});

test("kolom wajib hilang atau file kosong dilaporkan jelas", () => {
  assert.match(validateImport([["a", "b"], ["1", "2"]], ctx).errors[0].message, /Kolom wajib/);
  assert.match(validateImport([], ctx).errors[0].message, /kosong/);
  assert.match(validateImport([H.split(";")], ctx).errors[0].message, /Tidak ada baris/);
});
