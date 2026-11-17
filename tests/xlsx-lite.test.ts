import { test } from "node:test";
import assert from "node:assert/strict";
import { buildXlsx, readXlsx, unzip, zip } from "../src/lib/xlsx-lite.ts";

test("zip lalu unzip mengembalikan isi yang sama", () => {
  const out = unzip(zip([["a.txt", "halo dunia ".repeat(50)], ["dir/b.xml", "<x>é</x>"]]));
  assert.equal(new TextDecoder().decode(out.get("a.txt")), "halo dunia ".repeat(50));
  assert.equal(new TextDecoder().decode(out.get("dir/b.xml")), "<x>é</x>");
});

test("xlsx: tulis lalu baca (karakter khusus, angka, sel kosong, pilih sheet Produk)", () => {
  const bytes = buildXlsx([
    { name: "Petunjuk", rows: [["x"], ["lain"]] },
    { name: "Produk", rows: [["nama_id", "harga_modal", "catatan"], ["A & B <\"C\">", 5000000, ""], ["", "", "akhir; titik koma"]], validations: [{ sqref: "B2:B9", formula: '"X,Y"' }], freezeHeader: true, requiredCols: [0] },
  ]);
  const rows = readXlsx(bytes);
  assert.deepEqual(rows, [["nama_id", "harga_modal", "catatan"], ["A & B <\"C\">", "5000000", ""], ["", "", "akhir; titik koma"]]);
  assert.deepEqual(readXlsx(bytes, "Petunjuk"), [["x"], ["lain"]]);
});

test("file bukan xlsx ditolak dengan pesan jelas", () => {
  assert.throws(() => readXlsx(new TextEncoder().encode("bukan zip sama sekali, hanya teks biasa")), /Excel/);
});

test("zip-bomb dibatasi", () => {
  const big = zip([["xl/workbook.xml", "a".repeat(21 * 1024 * 1024)]]);
  assert.throws(() => unzip(big), /terlalu besar/);
});
