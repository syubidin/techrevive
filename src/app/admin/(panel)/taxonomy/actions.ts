"use server";

import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/lib/catalog-cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission, slugify } from "@/lib/admin";
import { normalizeIdPhone } from "@/lib/phone";
import { logoUrlSchema } from "@/lib/logo-url";

const back = (error?: string): never => redirect(error ? `/admin/taxonomy?error=${encodeURIComponent(error)}` : "/admin/taxonomy");
const done = (): never => {
  revalidatePath("/", "layout");
  invalidateCatalog();
  return back();
};
const keyRe = /^[a-z][a-z0-9_]{1,39}$/;

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return back("Data dengan nama/kunci yang sama sudah ada.");
    if (e instanceof z.ZodError) return back("Data tidak valid.");
    throw e;
  }
}

export async function addCategory(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.manage");
  await guard(async () => {
    const d = z.object({ nameId: z.string().trim().min(2).max(60), nameEn: z.string().trim().min(2).max(60) }).parse(Object.fromEntries(formData));
    const slug = slugify(d.nameEn);
    if (!slug) return back("Nama kategori tidak valid.");
    const c = await db.category.create({ data: { ...d, slug } });
    await audit(me.id, "category.create", "Category", c.id);
  });
  done();
}

export async function addBrand(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.manage");
  await guard(async () => {
    const d = z.object({ name: z.string().trim().min(1).max(60), logoUrl: logoUrlSchema }).parse(Object.fromEntries(formData));
    const slug = slugify(d.name);
    if (!slug) return back("Nama merk tidak valid.");
    const b = await db.brand.create({ data: { name: d.name, slug, logoUrl: d.logoUrl } });
    await audit(me.id, "brand.create", "Brand", b.id);
  });
  done();
}

export async function addSupplier(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.manage");
  await guard(async () => {
    const d = z.object({ name: z.string().trim().min(2).max(80), waNumber: z.string().trim().max(25).optional(), notes: z.string().trim().max(500).optional() }).parse(Object.fromEntries(formData));
    const wa = d.waNumber ? normalizeIdPhone(d.waNumber) : null;
    if (d.waNumber && !wa) return back("Nomor WA supplier tidak valid.");
    const s = await db.supplier.create({ data: { name: d.name, waNumber: wa, notes: d.notes || null } });
    await audit(me.id, "supplier.create", "Supplier", s.id);
  });
  done();
}

export async function addSpec(formData: FormData): Promise<void> {
  const me = await requirePermission("taxonomy.manage");
  await guard(async () => {
    const d = z.object({
      categoryId: z.string().cuid(), key: z.string().trim().toLowerCase().regex(keyRe),
      labelId: z.string().trim().min(1).max(60), labelEn: z.string().trim().min(1).max(60),
      type: z.enum(["NUMBER", "ENUM", "BOOLEAN"]), unit: z.string().trim().max(10).optional(), options: z.string().trim().max(400).optional(),
    }).parse(Object.fromEntries(formData));
    const options = d.type === "ENUM" ? [...new Set((d.options ?? "").split(",").map((o) => o.trim()).filter(Boolean))].slice(0, 30) : [];
    if (d.type === "ENUM" && options.length < 2) return back("Spek tipe pilihan butuh minimal 2 opsi (pisahkan koma).");
    const s = await db.specDefinition.create({ data: { categoryId: d.categoryId, key: d.key, labelId: d.labelId, labelEn: d.labelEn, type: d.type, unit: d.unit || null, options } });
    await audit(me.id, "spec.create", "SpecDefinition", s.id);
  });
  done();
}
