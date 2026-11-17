/** Deteksi tipe gambar dari byte awal (magic bytes); tidak percaya Content-Type/ekstensi dari klien. */
export type ImageType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return { mime: "image/png", ext: "png" };
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/**
 * Apakah gambar PNG/WebP benar-benar punya kanal transparan (bukan sekadar berekstensi PNG).
 * PNG: tipe warna 4/6, atau chunk tRNS (palet transparan). WebP: bendera alpha pada VP8X, atau VP8L dengan alpha dipakai.
 * JPEG tidak pernah transparan.
 */
export function hasAlpha(b: Uint8Array, type: ImageType): boolean {
  if (type.mime === "image/png") {
    if (b.length < 26) return false;
    const colorType = b[25];
    if (colorType === 4 || colorType === 6) return true;
    for (let i = 8; i + 8 <= b.length;) { // telusuri chunk mencari tRNS
      const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
      const name = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
      if (name === "tRNS") return true;
      if (name === "IDAT" || name === "IEND") return false;
      i += 12 + len;
    }
    return false;
  }
  if (type.mime === "image/webp") {
    const fourcc = String.fromCharCode(...b.slice(12, 16));
    if (fourcc === "VP8X") return b.length > 20 && (b[20] & 0x10) !== 0;
    if (fourcc === "VP8L") return b.length > 24 && ((b[24] >> 4) & 1) === 1; // bit alpha_is_used pada header VP8L
    return false;
  }
  return false;
}
