/**
 * Konversi gambar ke WebP di browser sebelum diunggah (lebih ringan, lolos batas ukuran body serverless,
 * dan metadata EXIF/lokasi ikut terbuang). Transparansi PNG dipertahankan.
 * Bila browser tidak bisa menghasilkan WebP (mis. Safari lama) atau hasilnya tidak lebih kecil, berkas asli dipakai apa adanya;
 * server tetap menyimpan sebagai WebP lewat transformasi masuk Cloudinary, jadi hasil akhirnya sama.
 */

/** Ukuran baru agar sisi terpanjang <= max (tidak pernah memperbesar), dibulatkan. Murni, bisa diuji. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: 0, h: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Nama berkas dengan ekstensi .webp. */
export function webpName(name: string): string {
  const base = name.replace(/\.[a-z0-9]{1,5}$/i, "").trim() || "gambar";
  return `${base}.webp`;
}

export async function toWebp(file: File, opts: { maxSide?: number; quality?: number } = {}): Promise<File> {
  const { maxSide = 1600, quality = 0.82 } = opts;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { w, h } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close(); return file; }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    // Browser yang tidak mendukung WebP mengembalikan PNG: pakai berkas asli. Jangan pula memperbesar berkas.
    if (!blob || blob.type !== "image/webp" || (blob.size >= file.size && file.type === "image/webp")) return file;
    return new File([blob], webpName(file.name), { type: "image/webp" });
  } catch {
    return file; // gambar tidak bisa didekode di browser: biarkan server yang memeriksa
  }
}
