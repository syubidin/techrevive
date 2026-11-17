import { COLUMN_HELP, TEMPLATE_COLUMNS, parseCsv } from "./product-import";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;

type CellValue = unknown;
function cellText(v: CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: Array<{ text: string }>; hyperlink?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.result !== undefined) return cellText(o.result);
    if (o.text !== undefined) return cellText(o.text);
  }
  return "";
}

/** Membaca .csv atau .xlsx menjadi matriks teks (baris pertama = header). */
export async function readMatrix(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(await file.text());
  if (!name.endsWith(".xlsx")) throw new Error("Format file harus .csv atau .xlsx.");
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await file.arrayBuffer()) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet("Produk") ?? wb.worksheets[0];
  if (!ws) throw new Error("File Excel tidak berisi sheet.");
  const cols = Math.min(ws.columnCount, 40);
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= cols; c++) cells.push(cellText(row.getCell(c).value).trim());
    if (cells.some((x) => x !== "")) rows.push(cells);
  });
  return rows;
}

export interface TemplateRefs {
  categories: Array<{ nameId: string; slug: string; specs: Array<{ key: string; type: string; options: string[] }> }>;
  brands: string[];
}

/** Template Excel: sheet Produk (dengan dropdown), Petunjuk, dan Referensi. */
export async function buildTemplateXlsx(refs: TemplateRefs): Promise<Uint8Array> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "TechRevive";

  const ref = wb.addWorksheet("Referensi");
  ref.addRow(["Kategori", "Slug", "Kunci spek yang boleh dipakai di kolom spek"]);
  for (const c of refs.categories) {
    ref.addRow([c.nameId, c.slug, c.specs.map((s) => (s.type === "ENUM" ? `${s.key} (${s.options.join("/")})` : `${s.key} (${s.type === "NUMBER" ? "angka" : "ya/tidak"})`)).join(", ")]);
  }
  ref.getColumn(1).width = 22; ref.getColumn(2).width = 18; ref.getColumn(3).width = 90;
  ref.getRow(1).font = { bold: true };
  const catEnd = Math.max(2, refs.categories.length + 1);

  const ws = wb.addWorksheet("Produk", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow([...TEMPLATE_COLUMNS]);
  ws.addRow(TEMPLATE_COLUMNS.map((c) => COLUMN_HELP[c].example));
  ws.addRow(TEMPLATE_COLUMNS.map((c) => ({ nama_id: "iPhone 12 128GB Black", nama_en: "iPhone 12 128GB Black", kategori: "Smartphone", merk: "Apple", kondisi: "BEKAS", grade: "B", baterai_persen: "85", harga_modal: "4200000", margin_persen: "10", berat_gram: "500", ketersediaan: "CEK", status: "DRAFT", deskripsi_id: "Bekas pakai wajar.", deskripsi_en: "Normal wear." } as Record<string, string>)[c] ?? ""));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF14284B" } };
  TEMPLATE_COLUMNS.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(14, Math.min(34, c.length + 8));
    if (COLUMN_HELP[c].required) ws.getCell(1, i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  });
  const list = (col: Column, formula: string) => {
    const idx = TEMPLATE_COLUMNS.indexOf(col) + 1;
    for (let r = 2; r <= 501; r++) ws.getCell(r, idx).dataValidation = { type: "list", allowBlank: true, formulae: [formula] };
  };
  type Column = (typeof TEMPLATE_COLUMNS)[number];
  list("kategori", `Referensi!$A$2:$A$${catEnd}`);
  list("kondisi", '"BEKAS,REFURBISHED"');
  list("grade", '"A,B,C"');
  list("ketersediaan", '"CEK,TERSEDIA,PREORDER,HABIS"');
  list("status", '"DRAFT,TERBIT"');

  const guide = wb.addWorksheet("Petunjuk");
  guide.addRow(["Kolom", "Wajib?", "Penjelasan", "Contoh"]);
  guide.getRow(1).font = { bold: true };
  for (const c of TEMPLATE_COLUMNS) guide.addRow([c, COLUMN_HELP[c].required ? "Ya" : "Tidak", COLUMN_HELP[c].help, COLUMN_HELP[c].example]);
  guide.addRow([]);
  guide.addRow(["Catatan", "", "Hapus 2 baris contoh sebelum mengisi data Anda. Maksimal 500 produk per file. Jika ada satu baris salah, tidak ada produk yang disimpan dan semua kesalahan ditampilkan."]);
  guide.getColumn(1).width = 18; guide.getColumn(2).width = 9; guide.getColumn(3).width = 80; guide.getColumn(4).width = 40;

  wb.worksheets.sort(); // urutan dibuat manual di bawah
  const order = ["Produk", "Petunjuk", "Referensi"];
  wb.worksheets.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
