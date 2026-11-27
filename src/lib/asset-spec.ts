/**
 * Daftar aset visual situs + pemeriksaan kualitas. Murni (tanpa fs) agar bisa diuji.
 * Nama berkas = key (tanpa ekstensi), disimpan di public/assets/<key>.(webp|png|jpg|svg).
 * Aturan: tidak ada teks di dalam gambar (dwibahasa ID/EN ditangani HTML), semua gambar memakai latar sendiri.
 */
/**
 * themed=true: berkas utama = versi TERANG; versi gelap (opsional, sangat disarankan) bernama "<key>-dark".
 * Tanpa versi gelap, versi terang dipakai di kedua mode. themed=false: satu gambar untuk semua mode.
 */
export type AssetSpec = { key: string; w: number; h: number; maxKb: number; use: string; themed: boolean };

export const ASSET_SPECS: readonly AssetSpec[] = [
  { key: "hero/hero-backdrop", w: 1920, h: 900, maxKb: 160, use: "Latar beranda (samar di belakang judul)", themed: true },
  { key: "cta/banner", w: 1200, h: 750, maxKb: 140, use: "Banner ajakan di bagian bawah beranda (desktop dan HP)", themed: false },
  { key: "categories/laptop", w: 960, h: 720, maxKb: 90, use: "Kartu kategori Laptop", themed: true },
  { key: "categories/smartphone", w: 960, h: 720, maxKb: 90, use: "Kartu kategori Smartphone", themed: true },
  { key: "categories/tablet", w: 960, h: 720, maxKb: 90, use: "Kartu kategori Tablet", themed: true },
  { key: "categories/accessories", w: 960, h: 720, maxKb: 90, use: "Kartu kategori Aksesori", themed: true },
  { key: "categories/default", w: 960, h: 720, maxKb: 90, use: "Cadangan untuk kategori baru tanpa gambar sendiri", themed: true },
  { key: "trust/why-grade", w: 800, h: 600, maxKb: 70, use: "Kenapa TechRevive: grade jujur", themed: true },
  { key: "trust/why-qc", w: 800, h: 600, maxKb: 70, use: "Kenapa TechRevive: lolos QC dan bergaransi", themed: true },
  { key: "trust/why-human", w: 800, h: 600, maxKb: 70, use: "Kenapa TechRevive: dibantu manusia", themed: true },
  { key: "process/step-1", w: 640, h: 480, maxKb: 60, use: "Cara pesan langkah 1: pilih produk", themed: true },
  { key: "process/step-2", w: 640, h: 480, maxKb: 60, use: "Cara pesan langkah 2: pilih dan pesan", themed: true },
  { key: "process/step-3", w: 640, h: 480, maxKb: 60, use: "Cara pesan langkah 3: kami konfirmasi", themed: true },
  { key: "process/step-4", w: 640, h: 480, maxKb: 60, use: "Cara pesan langkah 4: bayar dan terima", themed: true },
  { key: "grades/grade-a", w: 800, h: 600, maxKb: 70, use: "Penjelasan grade A", themed: true },
  { key: "grades/grade-b", w: 800, h: 600, maxKb: 70, use: "Penjelasan grade B", themed: true },
  { key: "grades/grade-c", w: 800, h: 600, maxKb: 70, use: "Penjelasan grade C", themed: true },
  { key: "states/not-found", w: 640, h: 480, maxKb: 60, use: "Halaman 404", themed: true },
  { key: "states/error", w: 640, h: 480, maxKb: 60, use: "Halaman error (500)", themed: true },
  { key: "about/founder", w: 800, h: 1000, maxKb: 100, use: "Foto pendiri di halaman Tentang Kami (rasio 4:5)", themed: false },
  { key: "about/workshop", w: 1600, h: 800, maxKb: 160, use: "Halaman Tentang Kami (foto asli bengkel/QC)", themed: false },
] as const;

export type ImageInfo = { w: number; h: number };

/** Baca lebar x tinggi dari byte PNG, JPEG, atau WebP. Null bila tidak dikenali. */
export function imageSize(b: Uint8Array): ImageInfo | null {
  const u16le = (i: number) => b[i] | (b[i + 1] << 8);
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) {
    return { w: ((b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19]) >>> 0, h: ((b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23]) >>> 0 };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      i += 2 + len;
    }
    return null;
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") {
    const f = String.fromCharCode(...b.slice(12, 16));
    if (f === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (f === "VP8L") return { w: 1 + (b[21] | ((b[22] & 0x3f) << 8)), h: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10)) };
    if (f === "VP8 ") return { w: u16le(26) & 0x3fff, h: u16le(28) & 0x3fff };
  }
  return null;
}

/** Peringatan (bukan galat) agar build tidak pernah gagal karena aset. Kosong = aman. */
export function checkAsset(spec: AssetSpec, info: ImageInfo | null, bytes: number, isSvg = false): string[] {
  const out: string[] = [];
  if (!isSvg) {
    if (!info) return ["format tidak dikenali (pakai WebP, PNG, atau JPG)"];
    if (info.w < spec.w * 0.9 || info.h < spec.h * 0.9) out.push(`resolusi ${info.w}x${info.h} kurang tajam, target ${spec.w}x${spec.h}`);
    if (Math.abs(info.w / info.h - spec.w / spec.h) / (spec.w / spec.h) > 0.04) out.push(`rasio ${info.w}x${info.h} beda dari ${spec.w}x${spec.h}, sisi gambar akan terpotong`);
  }
  if (bytes > spec.maxKb * 1024) out.push(`${Math.round(bytes / 1024)} KB melebihi batas ${spec.maxKb} KB, kompres dulu`);
  return out;
}
