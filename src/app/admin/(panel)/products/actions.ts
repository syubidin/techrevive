"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog-cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission, slugify } from "@/lib/admin";
import { computeSellPrice, meetsMinimumMargin, PricingError } from "@/lib/pricing";
import { site } from "@/config/site";
import { canDeleteProduct } from "@/lib/delete-guard";

export interface ProductState { error?: string }

const featureRe = /^[a-z0-9][a-z0-9-]{0,39}$/;
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const schema = z.object({
  id: z.string().cuid().optional(),
  nameId: z.string().trim().min(3).max(140),
  nameEn: z.string().trim().min(3).max(140),
  descriptionId: opt(4000),
  descriptionEn: opt(4000),
  categoryId: z.string().cuid(),
  brandId: z.string().cuid(),
  supplierId: z.union([z.literal(""), z.string().cuid()]).transform((v) => v || null),
  condition: z.enum(["REFURBISHED", "USED"]),
  grade: z.union([z.literal(""), z.enum(["A", "B", "C"])]).transform((v) => v || null),
  batteryHealth: z.union([z.literal(""), z.coerce.number().int().min(0).max(100)]).transform((v) => (v === "" ? null : v)),
  attributes: z.string().max(3000).optional().default(""),
  features: z.string().max(600).optional().default(""),
  weightGram: z.coerce.number().int().min(50).max(50_000),
  stockQty: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  costPrice: z.coerce.number().int().min(1).max(2_000_000_000),
  marginType: z.enum(["PERCENT_BPS", "FIXED"]),
  marginInput: z.coerce.number().min(0).max(2_000_000_000),
  availability: z.enum(["CHECK", "VERIFIED", "PREORDER", "SOLD_OUT"]),
  reverify: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  images: z.string().max(4000).optional().default(""),
  confirmLowMargin: z.string().optional(),
});

function parseImages(raw: string): string[] | string {
  const urls = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  if (urls.length > 8) return "Maksimal 8 gambar.";
  const host = process.env.IMAGE_HOST;
  for (const u of urls) {
    let parsed: URL;
    try { parsed = new URL(u); } catch { return `URL gambar tidak valid: ${u.slice(0, 60)}`; }
    if (parsed.protocol !== "https:") return "URL gambar harus https.";
    if (host && parsed.hostname !== host) return `Host gambar harus ${host}.`;
  }
  return urls;
}

export async function saveProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const me = await requirePermission("product.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: `Data tidak valid: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}` };
  const d = parsed.data;

  const category = await db.category.findUnique({ where: { id: d.categoryId }, include: { specs: true } });
  if (!category) return { error: "Kategori tidak ditemukan." };

  // Atribut: baris `kunci=nilai`, hanya kunci yang ada di definisi spek kategori.
  const attributes: Record<string, string | number | boolean> = {};
  for (const line of d.attributes.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const eq = line.indexOf("=");
    if (eq < 1) return { error: `Format spek salah: “${line.slice(0, 40)}”. Pakai kunci=nilai.` };
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    const def = category.specs.find((s) => s.key === key);
    if (!def) return { error: `Spek “${key}” belum didefinisikan untuk kategori ${category.nameId}. Tambahkan di Kategori & Spek.` };
    if (def.type === "NUMBER") {
      const n = Number(val);
      if (!Number.isFinite(n)) return { error: `Spek ${key} harus angka.` };
      attributes[key] = n;
    } else if (def.type === "BOOLEAN") {
      attributes[key] = ["1", "true", "ya", "yes"].includes(val.toLowerCase());
    } else {
      if (def.options.length && !def.options.includes(val)) return { error: `Nilai ${key} harus salah satu: ${def.options.join(", ")}.` };
      attributes[key] = val;
    }
  }

  const features = [...new Set(d.features.split(",").map((f) => slugify(f)).filter(Boolean))];
  if (features.some((f) => !featureRe.test(f)) || features.length > 20) return { error: "Fitur tidak valid (maks 20, huruf/angka/strip)." };

  const images = parseImages(d.images);
  if (typeof images === "string") return { error: images };

  const marginValue = d.marginType === "PERCENT_BPS" ? Math.round(d.marginInput * 100) : Math.round(d.marginInput);
  let sellPrice: number;
  try {
    sellPrice = computeSellPrice({ costPrice: d.costPrice, marginType: d.marginType, marginValue });
  } catch (e) {
    return { error: e instanceof PricingError ? e.message : "Perhitungan harga gagal." };
  }
  if (!meetsMinimumMargin(sellPrice, d.costPrice, site.minMarginBps) && !d.confirmLowMargin) {
    return { error: `Margin di bawah ${site.minMarginBps / 100}%. Centang konfirmasi jika memang disengaja.` };
  }
  if (d.status === "PUBLISHED" && images.length === 0) return { error: "Produk yang dipublikasikan harus punya minimal 1 foto unit asli." };
  if (d.status === "PUBLISHED" && !d.grade) return { error: "Isi grade sebelum publikasi (kondisi harus jujur)." };

  const existing = d.id ? await db.product.findUnique({ where: { id: d.id } }) : null;
  if (d.id && !existing) return { error: "Produk tidak ditemukan." };
  const verifiedAt = d.availability === "VERIFIED" ? (d.reverify || existing?.availability !== "VERIFIED" ? new Date() : existing?.verifiedAt ?? new Date()) : null;

  const base = {
    nameId: d.nameId, nameEn: d.nameEn, descriptionId: d.descriptionId, descriptionEn: d.descriptionEn,
    categoryId: d.categoryId, brandId: d.brandId, supplierId: d.supplierId,
    condition: d.condition, grade: d.grade, batteryHealth: d.batteryHealth,
    attributes, features, weightGram: d.weightGram,
    costPrice: d.costPrice, marginType: d.marginType, marginValue, sellPrice,
    stockQty: d.stockQty,
    // Jumlah unit 0 berarti habis; tidak boleh tetap tampil tersedia.
    availability: d.stockQty === 0 ? ("SOLD_OUT" as const) : d.availability, verifiedAt, status: d.status,
  };
  const imageRows = images.map((url, i) => ({ url, alt: d.nameId, isPrimary: i === 0, sortOrder: i }));

  let savedId = d.id;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (existing) {
        await db.$transaction([
          db.productImage.deleteMany({ where: { productId: existing.id } }),
          db.product.update({ where: { id: existing.id }, data: { ...base, images: { create: imageRows } } }),
        ]);
      } else {
        const sku = `TR-${category.slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase().padEnd(3, "X")}-${String(randomInt(100000)).padStart(5, "0")}`;
        const slug = attempt === 0 ? slugify(d.nameId) : `${slugify(d.nameId)}-${sku.toLowerCase()}`;
        const created = await db.product.create({ data: { ...base, sku, slug: slug || sku.toLowerCase(), images: { create: imageRows } } });
        savedId = created.id;
      }
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && !existing) continue; // slug/sku bentrok
      console.error(JSON.stringify({ evt: "product.save.error", message: e instanceof Error ? e.message : "unknown" }));
      return { error: "Gagal menyimpan produk." };
    }
  }
  if (!savedId) return { error: "Gagal membuat SKU/slug unik. Coba lagi." };

  await audit(me.id, existing ? "product.update" : "product.create", "Product", savedId, {
    costPrice: existing ? [existing.costPrice, d.costPrice] : d.costPrice,
    sellPrice: existing ? [existing.sellPrice, sellPrice] : sellPrice,
    status: d.status,
  });
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  invalidateCatalog();
  redirect("/admin/products");
}

export async function archiveProduct(formData: FormData): Promise<void> {
  const me = await requirePermission("product.manage");
  const id = z.string().cuid().parse(formData.get("id"));
  await db.product.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit(me.id, "product.archive", "Product", id);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  invalidateCatalog();
}

/** Mengembalikan produk dari arsip sebagai Draft (cek ulang sebelum diterbitkan). */
export async function restoreProduct(formData: FormData): Promise<void> {
  const me = await requirePermission("product.manage");
  const id = z.string().cuid().parse(formData.get("id"));
  await db.product.update({ where: { id }, data: { deletedAt: null, status: "DRAFT" } });
  await audit(me.id, "product.restore", "Product", id);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  invalidateCatalog();
}

/** Hapus permanen: hanya Admin/Developer, hanya dari arsip, dan hanya bila belum punya inquiry. */
export async function deleteProductPermanently(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const id = z.string().cuid().parse(formData.get("id"));
  const p = await db.product.findUnique({ where: { id }, select: { sku: true, nameId: true, deletedAt: true, _count: { select: { inquiries: true } } } });
  if (!p) redirect("/admin/products?view=archived");
  const blocked = canDeleteProduct({ archived: !!p!.deletedAt, inquiryCount: p!._count.inquiries });
  if (blocked) redirect(`/admin/products?view=archived&error=${encodeURIComponent(blocked)}`);
  await db.product.delete({ where: { id } }); // foto ikut terhapus (cascade)
  await audit(me.id, "product.delete", "Product", id, { sku: p!.sku, name: p!.nameId });
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  invalidateCatalog();
  redirect("/admin/products?view=archived");
}
