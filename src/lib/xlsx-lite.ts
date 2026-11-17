/**
 * Pembaca/penulis .xlsx minimal TANPA dependensi pihak ketiga (hanya node:zlib), menggantikan exceljs
 * yang membawa banyak paket rentan (tmp, uuid, fast-csv). Cukup untuk impor produk dan template.
 * Aman: XML tidak diurai dengan parser (tidak ada XXE), ukuran hasil dekompresi dibatasi (anti zip-bomb).
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";

const MAX_ENTRY = 20 * 1024 * 1024;
const MAX_ENTRIES = 200;

// ---------- ZIP ----------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function unzip(buf: Uint8Array): Map<string, Uint8Array> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Bukan file Excel (.xlsx) yang valid.");
  const count = dv.getUint16(eocd + 10, true);
  if (count > MAX_ENTRIES) throw new Error("File Excel tidak wajar (terlalu banyak bagian).");
  let p = dv.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("File Excel rusak.");
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
    if (name.endsWith("/")) continue;
    if (usize > MAX_ENTRY) throw new Error("File Excel terlalu besar setelah dibuka.");
    if (dv.getUint32(off, true) !== 0x04034b50) throw new Error("File Excel rusak.");
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const raw = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, new Uint8Array(inflateRawSync(raw, { maxOutputLength: MAX_ENTRY })));
    else throw new Error("Kompresi file Excel tidak didukung.");
  }
  return out;
}

export function zip(files: Array<[string, string]>): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const [name, text] of files) {
    const nameB = enc.encode(name), data = enc.encode(text), comp = new Uint8Array(deflateRawSync(data));
    const crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(8), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(comp.length), ...u32(data.length), ...u16(nameB.length), ...u16(0)];
    chunks.push(new Uint8Array([0x50, 0x4b, 3, 4, ...common]), nameB, comp);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += 30 + nameB.length + comp.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), 0, 0]);
  const all = [...chunks, ...central, end];
  const res = new Uint8Array(all.reduce((s, c) => s + c.length, 0));
  let o = 0; for (const c of all) { res.set(c, o); o += c.length; }
  return res;
}

// ---------- XML helpers ----------
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
const unesc = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
  if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()]!;
});
const text = (b: Uint8Array | undefined) => (b ? new TextDecoder().decode(b) : "");
const colIndex = (ref: string) => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const colName = (i: number) => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

// ---------- BACA ----------
/** Membaca sheet bernama `prefer` (atau sheet pertama) menjadi matriks teks. */
export function readXlsx(bytes: Uint8Array, prefer = "Produk"): string[][] {
  const files = unzip(bytes);
  const wb = text(files.get("xl/workbook.xml"));
  if (!wb) throw new Error("Bukan file Excel (.xlsx) yang valid.");
  const rels = text(files.get("xl/_rels/workbook.xml.rels"));
  const sheets = [...wb.matchAll(/<sheet\b[^>]*>/g)].map((m) => ({ name: unesc(m[0].match(/\bname="([^"]*)"/)?.[1] ?? ""), rid: m[0].match(/\br:id="([^"]*)"/)?.[1] ?? "" }));
  if (!sheets.length) throw new Error("File Excel tidak berisi sheet.");
  const pick = sheets.find((s) => s.name === prefer) ?? sheets[0];
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.match(/\bId="([^"]*)"/)?.[1] === pick.rid);
  let target = rel?.match(/\bTarget="([^"]*)"/)?.[1] ?? "worksheets/sheet1.xml";
  target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  const sheetXml = text(files.get(target));
  if (!sheetXml) throw new Error("Isi sheet tidak ditemukan.");

  const shared: string[] = [];
  for (const m of text(files.get("xl/sharedStrings.xml")).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    shared.push(unesc([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  }

  const rows: string[][] = [];
  for (const rm of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cm of rm[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], inner = cm[2] ?? "";
      const idx = colIndex(attrs.match(/\br="([A-Z]+\d+)"/)?.[1] ?? "A1");
      if (idx > 200) continue;
      const t = attrs.match(/\bt="([^"]*)"/)?.[1];
      let v = "";
      if (t === "inlineStr") v = unesc([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(""));
      else {
        const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
        v = t === "s" ? shared[Number(raw)] ?? "" : t === "b" ? (raw === "1" ? "TRUE" : "FALSE") : unesc(raw);
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = v.trim();
    }
    if (cells.some((c) => c !== "")) rows.push(cells);
    if (rows.length > 5000) throw new Error("Terlalu banyak baris.");
  }
  return rows;
}

// ---------- TULIS ----------
export interface SheetSpec {
  name: string;
  rows: Array<Array<string | number>>;
  widths?: number[];
  /** indeks kolom (0) yang header-nya ditandai wajib (biru) */
  requiredCols?: number[];
  freezeHeader?: boolean;
  /** sqref contoh "D2:D501", formula contoh `"A,B,C"` atau `Referensi!$A$2:$A$9` */
  validations?: Array<{ sqref: string; formula: string }>;
  wrap?: boolean;
}

export function buildXlsx(sheets: SheetSpec[]): Uint8Array {
  const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  const sheetXml = (s: SheetSpec) => {
    const rows = s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
      const ref = `${colName(ci)}${ri + 1}`;
      const style = ri === 0 ? (s.requiredCols?.includes(ci) ? 3 : 1) : s.wrap ? 2 : 0;
      if (typeof v === "number") return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
      return v === "" ? `<c r="${ref}" s="${style}"/>` : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    }).join("")}</row>`).join("");
    const cols = s.widths ? `<cols>${s.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    const pane = s.freezeHeader ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : "";
    const dv = s.validations?.length ? `<dataValidations count="${s.validations.length}">${s.validations.map((v) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.sqref}"><formula1>${esc(v.formula).replace(/&quot;/g, '"')}</formula1></dataValidation>`).join("")}</dataValidations>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS}><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>${cols}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
  };
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ${NS}><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF14284B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files: Array<[string, string]> = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", styles],
    ...sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  return zip(files);
}
