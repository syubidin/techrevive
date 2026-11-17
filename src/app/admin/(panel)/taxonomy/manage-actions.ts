"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog-cache";
import { logoUrlSchema } from "@/lib/logo-url";
import { releaseUnusedImages } from "@/lib/image-cleanup";
import { canDeleteBrand, canDeleteCategory } from "@/lib/delete-guard";
import { normalizeIdPhone } from "@/lib/phone";

/** Ubah: Owner dan Developer (taxonomy.edit). Hapus: hanya Admin/Developer (data.manage). */
const back = (error?: string): never => redirect(error ? `/admin/taxonomy?error=${encodeURIComponent(error)}` : "/admin/taxonomy");
const done = (): never => {
  revalidatePath("/", "layout");
  invalidateCatalog();
  return back();
};
const id = z.string().cuid();

export async function updateCategory(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.edit");
  const d = z.object({ id, nameId: z.string().trim().min(2).max(60), nameEn: z.string().trim().min(2).max(60) }).safeParse(Object.fromEntries(formData));
  if (!d.success) return back("Data kategori tidak valid.");
  // slug sengaja tidak berubah agar tautan katalog dan filter lama tetap berlaku.
  await db.category.update({ where: { id: d.data.id }, data: { nameId: d.data.nameId, nameEn: d.data.nameEn } });
  await audit(me.id, "category.update", "Category", d.data.id);
  done();
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const cid = id.safeParse(formData.get("id"));
  if (!cid.success) return back("Data tidak valid.");
  const c = await db.category.findUnique({ where: { id: cid.data }, select: { nameId: true, _count: { select: { products: true } } } });
  if (!c) return back("Kategori tidak ditemukan.");
  const blocked = canDeleteCategory({ products: c._count.products });
  if (blocked) return back(`Kategori “${c.nameId}” tidak bisa dihapus. ${blocked}`);
  await db.category.delete({ where: { id: cid.data } }); // definisi spek ikut terhapus (cascade)
  await audit(me.id, "category.delete", "Category", cid.data, { name: c.nameId });
  done();
}

export async function updateBrand(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.edit");
  const d = z.object({ id, name: z.string().trim().min(1).max(60), logoUrl: logoUrlSchema }).safeParse(Object.fromEntries(formData));
  if (!d.success) return back("Nama merk atau logo tidak valid.");
  const before = await db.brand.findUnique({ where: { id: d.data.id }, select: { logoUrl: true } });
  await db.brand.update({ where: { id: d.data.id }, data: { name: d.data.name, logoUrl: d.data.logoUrl } });
  if (before?.logoUrl && before.logoUrl !== d.data.logoUrl) await releaseUnusedImages([before.logoUrl]);
  await audit(me.id, "brand.update", "Brand", d.data.id);
  done();
}

export async function deleteBrand(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const bid = id.safeParse(formData.get("id"));
  if (!bid.success) return back("Data tidak valid.");
  const b = await db.brand.findUnique({ where: { id: bid.data }, select: { name: true, logoUrl: true, _count: { select: { products: true } } } });
  if (!b) return back("Merk tidak ditemukan.");
  const blocked = canDeleteBrand({ products: b._count.products });
  if (blocked) return back(`Merk “${b.name}” tidak bisa dihapus. ${blocked}`);
  await db.brand.delete({ where: { id: bid.data } });
  await releaseUnusedImages([b.logoUrl]);
  await audit(me.id, "brand.delete", "Brand", bid.data, { name: b.name });
  done();
}

export async function updateSupplier(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.edit");
  const d = z.object({ id, name: z.string().trim().min(2).max(80), waNumber: z.string().trim().max(25).optional(), notes: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!d.success) return back("Data supplier tidak valid.");
  const wa = d.data.waNumber ? normalizeIdPhone(d.data.waNumber) : null;
  if (d.data.waNumber && !wa) return back("Nomor WA supplier tidak valid.");
  await db.supplier.update({ where: { id: d.data.id }, data: { name: d.data.name, waNumber: wa, notes: d.data.notes || null } });
  await audit(me.id, "supplier.update", "Supplier", d.data.id);
  done();
}

export async function deleteSupplier(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const sid = id.safeParse(formData.get("id"));
  if (!sid.success) return back("Data tidak valid.");
  const s = await db.supplier.findUnique({ where: { id: sid.data }, select: { name: true } });
  if (!s) return back("Supplier tidak ditemukan.");
  await db.supplier.delete({ where: { id: sid.data } }); // produk terkait menjadi "tanpa supplier"
  await audit(me.id, "supplier.delete", "Supplier", sid.data, { name: s.name });
  done();
}

export async function updateSpec(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.edit");
  const d = z.object({ id, labelId: z.string().trim().min(1).max(60), labelEn: z.string().trim().min(1).max(60), unit: z.string().trim().max(10).optional(), options: z.string().trim().max(400).optional() }).safeParse(Object.fromEntries(formData));
  if (!d.success) return back("Data spek tidak valid.");
  const spec = await db.specDefinition.findUnique({ where: { id: d.data.id }, select: { type: true } });
  if (!spec) return back("Spek tidak ditemukan.");
  // Kunci dan tipe tidak diubah: nilai spek yang sudah tersimpan di produk bergantung padanya.
  const options = spec.type === "ENUM" ? [...new Set((d.data.options ?? "").split(",").map((o) => o.trim()).filter(Boolean))].slice(0, 30) : [];
  if (spec.type === "ENUM" && options.length < 2) return back("Spek tipe pilihan butuh minimal 2 opsi (pisahkan koma).");
  await db.specDefinition.update({ where: { id: d.data.id }, data: { labelId: d.data.labelId, labelEn: d.data.labelEn, unit: d.data.unit || null, options } });
  await audit(me.id, "spec.update", "SpecDefinition", d.data.id);
  done();
}

export async function deleteSpec(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const sid = id.safeParse(formData.get("id"));
  if (!sid.success) return back("Data tidak valid.");
  const s = await db.specDefinition.findUnique({ where: { id: sid.data }, select: { key: true } });
  if (!s) return back("Spek tidak ditemukan.");
  await db.specDefinition.delete({ where: { id: sid.data } });
  await audit(me.id, "spec.delete", "SpecDefinition", sid.data, { key: s.key });
  done();
}
