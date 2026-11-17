import { COLUMN_HELP, MAX_ROWS, TEMPLATE_COLUMNS, parseCsv } from "./product-import.ts";
import { buildXlsx, readXlsx } from "./xlsx-lite.ts";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Membaca .csv atau .xlsx menjadi matriks teks (baris pertama = header). */
export async function readMatrix(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(await file.text());
  if (!name.endsWith(".xlsx")) throw new Error("Format file harus .csv atau .xlsx.");
  return readXlsx(new Uint8Array(await file.arrayBuffer()), "Produk").slice(0, MAX_ROWS + 5).map((r) => r.slice(0, 40));
}

export interface TemplateRefs {
  categories: Array<{ nameId: string; slug: string; specs: Array<{ key: string; type: string; options: string[] }> }>;
  brands: string[];
}

/** Template Excel: sheet Produk (dengan dropdown), Petunjuk, dan Referensi. */
export async function buildTemplateXlsx(refs: TemplateRefs): Promise<Uint8Array> {
  const catEnd = Math.max(2, refs.categories.length + 1);
  const col = (c: (typeof TEMPLATE_COLUMNS)[number]) => String.fromCharCode(65 + TEMPLATE_COLUMNS.indexOf(c));
  const example2: Record<string, string> = { nama_id: "iPhone 12 128GB Black", nama_en: "iPhone 12 128GB Black", kategori: "Smartphone", merk: "Apple", kondisi: "BEKAS", grade: "B", baterai_persen: "85", harga_modal: "4200000", margin_persen: "10", berat_gram: "500", ketersediaan: "CEK", status: "DRAFT", deskripsi_id: "Bekas pakai wajar.", deskripsi_en: "Normal wear." };
  return buildXlsx([
    {
      name: "Produk",
      rows: [[...TEMPLATE_COLUMNS], TEMPLATE_COLUMNS.map((c) => COLUMN_HELP[c].example), TEMPLATE_COLUMNS.map((c) => example2[c] ?? "")],
      widths: TEMPLATE_COLUMNS.map((c) => Math.max(14, Math.min(34, c.length + 8))),
      requiredCols: TEMPLATE_COLUMNS.map((c, i) => (COLUMN_HELP[c].required ? i : -1)).filter((i) => i >= 0),
      freezeHeader: true,
      validations: [
        { sqref: `${col("kategori")}2:${col("kategori")}501`, formula: `Referensi!$A$2:$A$${catEnd}` },
        { sqref: `${col("kondisi")}2:${col("kondisi")}501`, formula: '"BEKAS,REFURBISHED"' },
        { sqref: `${col("grade")}2:${col("grade")}501`, formula: '"A,B,C"' },
        { sqref: `${col("ketersediaan")}2:${col("ketersediaan")}501`, formula: '"CEK,TERSEDIA,PREORDER,HABIS"' },
        { sqref: `${col("status")}2:${col("status")}501`, formula: '"DRAFT,TERBIT"' },
      ],
    },
    {
      name: "Petunjuk",
      rows: [
        ["Kolom", "Wajib?", "Penjelasan", "Contoh"],
        ...TEMPLATE_COLUMNS.map((c): string[] => [c, COLUMN_HELP[c].required ? "Ya" : "Tidak", COLUMN_HELP[c].help, COLUMN_HELP[c].example]),
        [],
        ["Catatan", "", `Hapus 2 baris contoh sebelum mengisi data Anda. Maksimal ${MAX_ROWS} produk per file. Jika ada satu baris salah, tidak ada produk yang disimpan dan semua kesalahan ditampilkan.`, ""],
      ],
      widths: [18, 9, 80, 40],
      wrap: true,
    },
    {
      name: "Referensi",
      rows: [
        ["Kategori", "Slug", "Kunci spek yang boleh dipakai di kolom spek"],
        ...refs.categories.map((c): string[] => [c.nameId, c.slug, c.specs.map((s) => (s.type === "ENUM" ? `${s.key} (${s.options.join("/")})` : `${s.key} (${s.type === "NUMBER" ? "angka" : "ya/tidak"})`)).join(", ")]),
      ],
      widths: [22, 18, 90],
    },
  ]);
}
