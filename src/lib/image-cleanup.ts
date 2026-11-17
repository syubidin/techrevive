import { cloudinaryConfig, destroyAsset, listAssets, publicIdFromUrl } from "./cloudinary";
import { db } from "./db";

/**
 * Hapus aset Cloudinary yang tidak lagi dipakai (best-effort, tidak pernah menggagalkan penyimpanan data).
 * Aman: hanya aset milik kita, dan hanya bila tidak dipakai produk/merk lain (file sama bisa dipakai bersama).
 */
export async function releaseUnusedImages(urls: Array<string | null | undefined>): Promise<number> {
  const cfg = cloudinaryConfig();
  if (!cfg) return 0;
  let removed = 0;
  for (const url of new Set(urls.filter((u): u is string => !!u))) {
    try {
      const id = publicIdFromUrl(url, cfg);
      if (!id) continue;
      const [a, b] = await Promise.all([db.productImage.count({ where: { url } }), db.brand.count({ where: { logoUrl: url } })]);
      if (a + b > 0) continue;
      await destroyAsset(cfg, id);
      removed++;
    } catch (e) {
      console.error(JSON.stringify({ evt: "image.release.error", message: e instanceof Error ? e.message : "unknown" }));
    }
  }
  return removed;
}

/** Aset di Cloudinary yang tidak dirujuk database dan sudah lewat 24 jam (mis. diunggah tetapi form tidak jadi disimpan). */
export async function sweepOrphanImages(now = new Date(), maxDelete = 50): Promise<number> {
  const cfg = cloudinaryConfig();
  if (!cfg) return 0;
  try {
    const [imgs, brands, assets] = await Promise.all([
      db.productImage.findMany({ select: { url: true } }),
      db.brand.findMany({ where: { logoUrl: { not: null } }, select: { logoUrl: true } }),
      listAssets(cfg, 1000),
    ]);
    const used = new Set<string>();
    for (const u of [...imgs.map((i) => i.url), ...brands.map((b) => b.logoUrl!)]) {
      const id = publicIdFromUrl(u, cfg);
      if (id) used.add(id);
    }
    const cutoff = now.getTime() - 24 * 3600_000;
    const orphans = assets.filter((a) => !used.has(a.publicId) && a.createdAt.getTime() < cutoff).slice(0, maxDelete);
    for (const o of orphans) await destroyAsset(cfg, o.publicId);
    return orphans.length;
  } catch (e) {
    console.error(JSON.stringify({ evt: "image.sweep.error", message: e instanceof Error ? e.message : "unknown" }));
    return 0;
  }
}
