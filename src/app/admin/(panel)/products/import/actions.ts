"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, requirePermission, slugify } from "@/lib/admin";
import { site } from "@/config/site";
import { revalidateStorefront } from "@/lib/catalog-cache";
import { MAX_FILE_BYTES, readMatrix } from "@/lib/import-file";
import { validateImport, type ParsedProduct } from "@/lib/product-import";

export interface ImportState {
  error?: string;
  errors?: Array<{ row: number; message: string }>;
  summary?: { total: number; created: number; checkOnly: boolean; newBrands: string[]; newSuppliers: string[]; preview: Array<{ row: number; name: string; price: number; status: string }> };
}

const makeSku = (slug: string) => `TR-${slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X")}-${String(randomInt(100000)).padStart(5, "0")}`;

export async function importProducts(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const me = await requirePermission("product.manage");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file CSV atau Excel (.xlsx) terlebih dahulu." };
  if (file.size > MAX_FILE_BYTES) return { error: "Ukuran file maksimal 2 MB." };
  const checkOnly = formData.get("checkOnly") === "on";

  let matrix: string[][];
  try { matrix = await readMatrix(file); } catch (e) { return { error: e instanceof Error ? e.message : "File tidak bisa dibaca." }; }

  const [categories, brands, suppliers, existing] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true, nameId: true, nameEn: true, specs: { select: { key: true, type: true, options: true } } } }),
    db.brand.findMany({ select: { id: true, name: true } }),
    db.supplier.findMany({ select: { id: true, name: true } }),
    db.product.findMany({ select: { sku: true, slug: true } }),
  ]);
  const result = validateImport(matrix, {
    categories, brands, suppliers, existingSkus: new Set(existing.map((s) => s.sku)), minMarginBps: site.minMarginBps, imageHost: process.env.IMAGE_HOST?.trim() || undefined,
  });
  if (result.errors.length) return { errors: result.errors.slice(0, 100), error: result.errors.length > 100 ? `Menampilkan 100 dari ${result.errors.length} kesalahan.` : undefined };

  const preview = result.products.slice(0, 8).map((p) => ({ row: p.row, name: p.nameId, price: p.sellPrice, status: p.status }));
  const base = { total: result.products.length, newBrands: result.newBrands, newSuppliers: result.newSuppliers, preview };
  if (checkOnly) return { summary: { ...base, created: 0, checkOnly: true } };

  const usedSlugs = new Set(existing.map((s) => s.slug));
  const usedSkus = new Set(existing.map((s) => s.sku));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.$transaction(async (tx) => {
        const brandIds = new Map<string, string>();
        for (const p of result.products) {
          if (p.brandId) { brandIds.set(p.brandName.toLowerCase(), p.brandId); continue; }
          const key = p.brandName.toLowerCase();
          if (brandIds.has(key)) continue;
          const slug = slugify(p.brandName) || "brand";
          const b = await tx.brand.upsert({ where: { slug }, update: {}, create: { slug, name: p.brandName } });
          brandIds.set(key, b.id);
        }
        const supplierIds = new Map<string, string>();
        for (const p of result.products) {
          if (!p.supplierName || p.supplierId) continue;
          const key = p.supplierName.toLowerCase();
          if (supplierIds.has(key)) continue;
          const found = await tx.supplier.findFirst({ where: { name: { equals: p.supplierName, mode: "insensitive" } } });
          supplierIds.set(key, found ? found.id : (await tx.supplier.create({ data: { name: p.supplierName } })).id);
        }
        for (const p of result.products) {
          let sku = p.sku;
          if (!sku) { do sku = makeSku(p.categorySlug); while (usedSkus.has(sku)); }
          usedSkus.add(sku);
          let slug = slugify(p.nameId) || sku.toLowerCase();
          if (usedSlugs.has(slug)) slug = `${slug}-${sku.toLowerCase()}`;
          usedSlugs.add(slug);
          const sup = p.supplierId ?? (p.supplierName ? supplierIds.get(p.supplierName.toLowerCase()) ?? null : null);
          await tx.product.create({ data: toData(p, sku, slug, p.brandId ?? brandIds.get(p.brandName.toLowerCase())!, sup) });
        }
      }, { timeout: 45_000, maxWait: 10_000 });
      await audit(me.id, "product.import", "Product", undefined, { file: file.name.slice(0, 80), count: result.products.length });
      revalidatePath("/admin/products");
      revalidateStorefront();
      return { summary: { ...base, created: result.products.length, checkOnly: false } };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 2) {
        // SKU/slug bentrok dengan penulisan bersamaan: muat ulang daftar dan coba lagi.
        const fresh = await db.product.findMany({ select: { sku: true, slug: true } });
        fresh.forEach((x) => { usedSkus.add(x.sku); usedSlugs.add(x.slug); });
        continue;
      }
      console.error(JSON.stringify({ evt: "product.import.error", message: e instanceof Error ? e.message : "unknown" }));
      return { error: "Gagal menyimpan. Tidak ada produk yang ditambahkan, silakan coba lagi." };
    }
  }
  return { error: "Gagal membuat SKU unik. Silakan coba lagi." };
}

function toData(p: ParsedProduct, sku: string, slug: string, brandId: string, supplierId: string | null): Prisma.ProductUncheckedCreateInput {
  return {
    sku, slug, nameId: p.nameId, nameEn: p.nameEn, descriptionId: p.descriptionId, descriptionEn: p.descriptionEn,
    categoryId: p.categoryId, brandId, supplierId, condition: p.condition, grade: p.grade, batteryHealth: p.batteryHealth,
    attributes: p.attributes, features: p.features, weightGram: p.weightGram, stockQty: p.stockQty,
    costPrice: p.costPrice, marginType: p.marginType, marginValue: p.marginValue, sellPrice: p.sellPrice,
    availability: p.availability, verifiedAt: p.availability === "VERIFIED" ? new Date() : null, status: p.status,
    images: { create: p.images.map((url, i) => ({ url, alt: p.nameId, isPrimary: i === 0, sortOrder: i })) },
  };
}
