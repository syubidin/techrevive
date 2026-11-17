/**
 * Impor produk dari CSV/Excel. Modul MURNI (tanpa DB/React) agar bisa diuji:
 * parser CSV, pemetaan kolom, validasi per baris, dan pembuat template CSV.
 * Prinsip: semua-atau-tidak-sama-sekali. Jika ada satu baris salah, tidak ada yang disimpan dan semua kesalahan dilaporkan.
 */
import { computeSellPrice, PricingError } from "./pricing.ts";

export const MAX_ROWS = 500;

export const TEMPLATE_COLUMNS = [
  "nama_id", "nama_en", "kategori", "merk", "kondisi", "grade", "baterai_persen", "harga_modal", "margin_persen", "harga_jual",
  "berat_gram", "stok", "ketersediaan", "status", "supplier", "fitur", "spek", "foto_url", "deskripsi_id", "deskripsi_en", "sku",
] as const;
export type Column = (typeof TEMPLATE_COLUMNS)[number];

/** Penjelasan tiap kolom (dipakai di halaman impor dan sheet Petunjuk). */
export const COLUMN_HELP: Record<Column, { required: boolean; help: string; example: string }> = {
  nama_id: { required: true, help: "Nama produk (Indonesia)", example: "Lenovo ThinkPad T14 Gen 2 i5/16GB/512GB" },
  nama_en: { required: false, help: "Nama produk (Inggris). Kosong = sama dengan nama_id", example: "Lenovo ThinkPad T14 Gen 2 i5/16GB/512GB" },
  kategori: { required: true, help: "Nama atau slug kategori yang sudah ada (lihat sheet Referensi)", example: "Laptop" },
  merk: { required: true, help: "Nama merk. Jika belum ada, dibuat otomatis", example: "Lenovo" },
  kondisi: { required: false, help: "BEKAS atau REFURBISHED. Kosong = REFURBISHED", example: "REFURBISHED" },
  grade: { required: false, help: "A, B, atau C (wajib bila status TERBIT)", example: "A" },
  baterai_persen: { required: false, help: "Kesehatan baterai 0-100", example: "88" },
  harga_modal: { required: true, help: "Harga modal dalam rupiah", example: "5000000" },
  margin_persen: { required: false, help: "Margin dari modal, persen. Kosong = 10. Diabaikan bila harga_jual diisi", example: "12" },
  harga_jual: { required: false, help: "Opsional. Jika diisi, margin dihitung dari sini (dibulatkan ke atas Rp1.000)", example: "" },
  berat_gram: { required: false, help: "Berat kemasan (gram). Kosong = 1000", example: "2500" },
  stok: { required: false, help: "Jumlah unit. Kosong = tidak diketahui, 0 = habis", example: "" },
  ketersediaan: { required: false, help: "CEK, TERSEDIA, PREORDER, atau HABIS. Kosong = CEK", example: "CEK" },
  status: { required: false, help: "DRAFT atau TERBIT. Kosong = DRAFT. TERBIT wajib punya grade dan foto", example: "DRAFT" },
  supplier: { required: false, help: "Nama supplier. Jika belum ada, dibuat otomatis", example: "" },
  fitur: { required: false, help: "Pisahkan dengan titik koma", example: "touchscreen; backlit-keyboard" },
  spek: { required: false, help: "kunci=nilai dipisah titik koma; kunci harus ada di spek kategori", example: "ram_gb=16; storage_gb=512; cpu_family=i5" },
  foto_url: { required: false, help: "URL https foto unit asli, pisahkan dengan titik koma (maks 8)", example: "" },
  deskripsi_id: { required: false, help: "Deskripsi (Indonesia)", example: "Unit mulus, baterai sehat." },
  deskripsi_en: { required: false, help: "Deskripsi (Inggris)", example: "Mint unit, healthy battery." },
  sku: { required: false, help: "Opsional. Kosong = dibuat otomatis. Harus unik", example: "" },
};

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const ALIASES: Record<Column, string[]> = {
  nama_id: ["namaid", "nama", "namaproduk", "name", "nameid", "produk"],
  nama_en: ["namaen", "nameen"],
  kategori: ["kategori", "category"],
  merk: ["merk", "merek", "brand"],
  kondisi: ["kondisi", "condition"],
  grade: ["grade"],
  baterai_persen: ["bateraipersen", "baterai", "battery", "batteryhealth"],
  harga_modal: ["hargamodal", "modal", "cost", "costprice"],
  margin_persen: ["marginpersen", "margin"],
  harga_jual: ["hargajual", "jual", "sellprice"],
  berat_gram: ["beratgram", "berat", "weight"],
  stok: ["stok", "stock", "jumlah"],
  ketersediaan: ["ketersediaan", "availability"],
  status: ["status"],
  supplier: ["supplier", "pemasok"],
  fitur: ["fitur", "features"],
  spek: ["spek", "spesifikasi", "specs"],
  foto_url: ["fotourl", "foto", "gambar", "images"],
  deskripsi_id: ["deskripsiid", "deskripsi", "description"],
  deskripsi_en: ["deskripsien", "descriptionen"],
  sku: ["sku", "kode"],
};

// ---------- CSV ----------

/** Parser CSV RFC 4180 (kutip ganda, koma/titik koma/tab otomatis, BOM, baris kosong diabaikan). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (c: string) => first.split(c).length - 1;
  const delim = [";", "\t", ","].reduce((best, c) => (count(c) > count(best) ? c : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const csvCell = (v: string) => (/[;"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Template CSV (titik koma agar langsung rapi di Excel versi Indonesia; BOM agar karakter benar). */
export function templateCsv(): string {
  const ex1: Record<string, string> = {};
  for (const c of TEMPLATE_COLUMNS) ex1[c] = COLUMN_HELP[c].example;
  const ex2: Record<string, string> = { ...ex1, nama_id: "iPhone 12 128GB Black", nama_en: "iPhone 12 128GB Black", kategori: "Smartphone", merk: "Apple", kondisi: "BEKAS", grade: "B", baterai_persen: "85", harga_modal: "4200000", margin_persen: "10", berat_gram: "500", spek: "", fitur: "", deskripsi_id: "Bekas pakai wajar.", deskripsi_en: "Normal wear." };
  const line = (o: Record<string, string>) => TEMPLATE_COLUMNS.map((c) => csvCell(o[c] ?? "")).join(";");
  return `﻿${TEMPLATE_COLUMNS.join(";")}\r\n${line(ex1)}\r\n${line(ex2)}\r\n`;
}

// ---------- Validasi ----------

export interface ImportContext {
  categories: Array<{ id: string; slug: string; nameId: string; nameEn: string; specs: Array<{ key: string; type: "NUMBER" | "ENUM" | "BOOLEAN"; options: string[] }> }>;
  brands: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  existingSkus: ReadonlySet<string>;
  minMarginBps: number;
  imageHost?: string;
}

export interface ParsedProduct {
  row: number;
  sku: string | null;
  nameId: string;
  nameEn: string;
  descriptionId: string | null;
  descriptionEn: string | null;
  categoryId: string;
  categorySlug: string;
  brandName: string;
  brandId: string | null;
  supplierName: string | null;
  supplierId: string | null;
  condition: "REFURBISHED" | "USED";
  grade: "A" | "B" | "C" | null;
  batteryHealth: number | null;
  attributes: Record<string, string | number | boolean>;
  features: string[];
  weightGram: number;
  stockQty: number | null;
  costPrice: number;
  marginType: "PERCENT_BPS" | "FIXED";
  marginValue: number;
  sellPrice: number;
  availability: "CHECK" | "VERIFIED" | "PREORDER" | "SOLD_OUT";
  status: "DRAFT" | "PUBLISHED";
  images: string[];
}

export interface ImportResult {
  products: ParsedProduct[];
  errors: Array<{ row: number; message: string }>;
  newBrands: string[];
  newSuppliers: string[];
  total: number;
}

/** "5.500.000", "Rp 5,500,000", "12,5" -> angka; kosong/tidak valid -> null (kosong) atau NaN (tidak valid). */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "").replace(/%$/, "");
  if (s === "") return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ""));
  if (/^\d+,\d+$/.test(s)) return Number(s.replace(",", "."));
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}

const slugify = (input: string) => input.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const splitList = (v: string) => v.split(/[;\n]/).map((x) => x.trim()).filter(Boolean);
const featureRe = /^[a-z0-9][a-z0-9-]{0,39}$/;

const CONDITION: Record<string, ParsedProduct["condition"]> = { bekas: "USED", used: "USED", second: "USED", refurbished: "REFURBISHED", refurb: "REFURBISHED" };
const AVAIL: Record<string, ParsedProduct["availability"]> = { cek: "CHECK", cekstok: "CHECK", check: "CHECK", tersedia: "VERIFIED", ready: "VERIFIED", verified: "VERIFIED", preorder: "PREORDER", po: "PREORDER", habis: "SOLD_OUT", soldout: "SOLD_OUT" };
const STATUS: Record<string, ParsedProduct["status"]> = { draft: "DRAFT", terbit: "PUBLISHED", tayang: "PUBLISHED", published: "PUBLISHED" };

export function validateImport(matrix: string[][], ctx: ImportContext): ImportResult {
  const out: ImportResult = { products: [], errors: [], newBrands: [], newSuppliers: [], total: 0 };
  if (matrix.length === 0) { out.errors.push({ row: 1, message: "File kosong." }); return out; }

  // Peta kolom
  const header = matrix[0].map(norm);
  const idx = {} as Record<Column, number>;
  for (const col of TEMPLATE_COLUMNS) idx[col] = header.findIndex((h) => ALIASES[col].includes(h));
  const missing = (["nama_id", "kategori", "merk", "harga_modal"] as Column[]).filter((c) => idx[c] < 0);
  if (missing.length) { out.errors.push({ row: 1, message: `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Gunakan template terbaru.` }); return out; }

  const dataRows = matrix.slice(1);
  out.total = dataRows.length;
  if (dataRows.length === 0) { out.errors.push({ row: 2, message: "Tidak ada baris produk." }); return out; }
  if (dataRows.length > MAX_ROWS) { out.errors.push({ row: 1, message: `Maksimal ${MAX_ROWS} produk per file (file ini ${dataRows.length}).` }); return out; }

  const get = (r: string[], c: Column) => (idx[c] >= 0 ? (r[idx[c]] ?? "").trim() : "");
  const catBy = new Map<string, ImportContext["categories"][number]>();
  for (const c of ctx.categories) for (const k of [c.slug, c.nameId, c.nameEn]) catBy.set(norm(k), c);
  const brandBy = new Map(ctx.brands.map((b) => [norm(b.name), b]));
  const supplierBy = new Map(ctx.suppliers.map((s) => [norm(s.name), s]));
  const seenSku = new Set<string>();
  const newBrands = new Map<string, string>();
  const newSuppliers = new Map<string, string>();

  dataRows.forEach((r, i) => {
    const row = i + 2; // nomor baris di Excel
    const errs: string[] = [];
    const bad = (m: string) => errs.push(m);

    const nameId = get(r, "nama_id");
    if (nameId.length < 3 || nameId.length > 140) bad("nama_id wajib diisi (3-140 karakter)");
    const nameEn = get(r, "nama_en") || nameId;

    const cat = catBy.get(norm(get(r, "kategori")));
    if (!cat) bad(`kategori “${get(r, "kategori")}” tidak ditemukan`);

    const brandName = get(r, "merk");
    if (!brandName) bad("merk wajib diisi");
    let brandId: string | null = null;
    if (brandName) {
      const b = brandBy.get(norm(brandName));
      if (b) brandId = b.id;
      else if (!newBrands.has(norm(brandName))) newBrands.set(norm(brandName), brandName);
    }
    const supplierName = get(r, "supplier") || null;
    let supplierId: string | null = null;
    if (supplierName) {
      const s = supplierBy.get(norm(supplierName));
      if (s) supplierId = s.id;
      else if (!newSuppliers.has(norm(supplierName))) newSuppliers.set(norm(supplierName), supplierName);
    }

    const condRaw = norm(get(r, "kondisi"));
    const condition = condRaw ? CONDITION[condRaw] : "REFURBISHED";
    if (!condition) bad("kondisi harus BEKAS atau REFURBISHED");

    const gradeRaw = get(r, "grade").toUpperCase();
    const grade = gradeRaw === "" ? null : (["A", "B", "C"].includes(gradeRaw) ? (gradeRaw as "A" | "B" | "C") : undefined);
    if (grade === undefined) bad("grade harus A, B, atau C");

    const num = (c: Column, label: string, opt: { min: number; max: number; int?: boolean }): number | null => {
      const n = parseNumber(get(r, c));
      if (n === null) return null;
      if (Number.isNaN(n) || n < opt.min || n > opt.max || (opt.int && !Number.isInteger(n))) { bad(`${label} tidak valid (${opt.min}-${opt.max})`); return null; }
      return n;
    };
    const battery = num("baterai_persen", "baterai_persen", { min: 0, max: 100, int: true });
    const cost = num("harga_modal", "harga_modal", { min: 1, max: 2_000_000_000, int: true });
    if (cost === null && !errs.some((e) => e.startsWith("harga_modal"))) bad("harga_modal wajib diisi");
    const marginPct = num("margin_persen", "margin_persen", { min: 0, max: 1000 });
    const sellOverride = num("harga_jual", "harga_jual", { min: 1, max: 2_000_000_000, int: true });
    const weight = num("berat_gram", "berat_gram", { min: 50, max: 50_000, int: true }) ?? 1000;
    const stock = num("stok", "stok", { min: 0, max: 100_000, int: true });

    const availRaw = norm(get(r, "ketersediaan"));
    let availability = availRaw ? AVAIL[availRaw] : "CHECK";
    if (!availability) { bad("ketersediaan harus CEK, TERSEDIA, PREORDER, atau HABIS"); availability = "CHECK"; }
    if (stock === 0) availability = "SOLD_OUT";

    const statusRaw = norm(get(r, "status"));
    const status = statusRaw ? STATUS[statusRaw] : "DRAFT";
    if (!status) bad("status harus DRAFT atau TERBIT");

    // Harga
    let marginType: ParsedProduct["marginType"] = "PERCENT_BPS";
    let marginValue = Math.round((marginPct ?? 10) * 100);
    let sellPrice = 0;
    if (cost !== null) {
      if (sellOverride !== null) {
        if (sellOverride < cost) bad("harga_jual lebih kecil dari harga_modal");
        marginType = "FIXED";
        marginValue = Math.max(0, sellOverride - cost);
      }
      try { sellPrice = computeSellPrice({ costPrice: cost, marginType, marginValue }); } catch (e) { bad(e instanceof PricingError ? e.message : "perhitungan harga gagal"); }
      if (sellPrice > 0 && ((sellPrice - cost) * 10_000) / sellPrice < ctx.minMarginBps) bad(`margin di bawah ${ctx.minMarginBps / 100}% (naikkan margin_persen atau harga_jual)`);
    }

    // Spek
    const attributes: ParsedProduct["attributes"] = {};
    for (const pair of splitList(get(r, "spek"))) {
      const eq = pair.indexOf("=");
      if (eq < 1) { bad(`spek “${pair.slice(0, 30)}” harus berformat kunci=nilai`); continue; }
      const key = pair.slice(0, eq).trim();
      const val = pair.slice(eq + 1).trim();
      const def = cat?.specs.find((s) => s.key === key);
      if (!cat) continue;
      if (!def) { bad(`spek “${key}” belum didefinisikan untuk kategori ${cat.nameId}`); continue; }
      if (def.type === "NUMBER") {
        const n = parseNumber(val);
        if (n === null || Number.isNaN(n)) bad(`spek ${key} harus angka`); else attributes[key] = n;
      } else if (def.type === "BOOLEAN") attributes[key] = ["1", "true", "ya", "yes"].includes(val.toLowerCase());
      else if (def.options.length && !def.options.includes(val)) bad(`spek ${key} harus salah satu: ${def.options.join(", ")}`);
      else attributes[key] = val;
    }

    const features = [...new Set(splitList(get(r, "fitur")).map(slugify).filter(Boolean))];
    if (features.length > 20 || features.some((f) => !featureRe.test(f))) bad("fitur tidak valid (maks 20, huruf/angka/strip)");

    const images = splitList(get(r, "foto_url"));
    if (images.length > 8) bad("foto_url maksimal 8");
    for (const u of images) {
      try {
        const url = new URL(u);
        if (url.protocol !== "https:") bad("foto_url harus https");
        else if (ctx.imageHost && url.hostname !== ctx.imageHost) bad(`host foto harus ${ctx.imageHost}`);
      } catch { bad(`foto_url tidak valid: ${u.slice(0, 40)}`); }
    }
    if (status === "PUBLISHED" && images.length === 0) bad("status TERBIT butuh minimal 1 foto_url");
    if (status === "PUBLISHED" && !grade) bad("status TERBIT butuh grade");

    const skuRaw = get(r, "sku").toUpperCase();
    if (skuRaw) {
      if (!/^[A-Z0-9][A-Z0-9-]{2,30}$/.test(skuRaw)) bad("sku hanya huruf besar/angka/strip (3-31 karakter)");
      else if (ctx.existingSkus.has(skuRaw)) bad(`sku ${skuRaw} sudah dipakai produk lain`);
      else if (seenSku.has(skuRaw)) bad(`sku ${skuRaw} dobel di file ini`);
      seenSku.add(skuRaw);
    }

    const desc = (c: Column) => get(r, c).slice(0, 4000) || null;
    if (errs.length) { for (const m of errs) out.errors.push({ row, message: m }); return; }
    out.products.push({
      row, sku: skuRaw || null, nameId, nameEn, descriptionId: desc("deskripsi_id"), descriptionEn: desc("deskripsi_en"),
      categoryId: cat!.id, categorySlug: cat!.slug, brandName, brandId, supplierName, supplierId,
      condition: condition!, grade: grade ?? null, batteryHealth: battery, attributes, features, weightGram: weight, stockQty: stock,
      costPrice: cost!, marginType, marginValue, sellPrice, availability, status: status!, images,
    });
  });

  out.newBrands = [...newBrands.values()];
  out.newSuppliers = [...newSuppliers.values()];
  return out;
}
