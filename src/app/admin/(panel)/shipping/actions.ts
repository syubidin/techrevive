"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission } from "@/lib/admin";
import { JABODETABEK_CITIES, normalizeCity } from "@/lib/shipping";

const schema = z.object({
  id: z.string().cuid().optional(),
  zone: z.string().trim().min(2).max(40),
  cities: z.string().max(400),
  baseFee: z.coerce.number().int().min(0).max(5_000_000),
  perKgFee: z.coerce.number().int().min(0).max(5_000_000),
  minDays: z.coerce.number().int().min(0).max(30),
  maxDays: z.coerce.number().int().min(0).max(30),
  isActive: z.string().optional(),
});

export async function saveRate(formData: FormData): Promise<void> {
  const me = await requirePermission("shipping.manage");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/shipping?error=Data%20tidak%20valid");
  const d = parsed.data;

  const cities = [...new Set(d.cities.split(",").map(normalizeCity).filter(Boolean))];
  const unknown = cities.filter((c) => !(JABODETABEK_CITIES as readonly string[]).includes(c));
  if (!cities.length || unknown.length) redirect(`/admin/shipping?error=${encodeURIComponent(`Kota tidak dikenal: ${unknown.join(", ") || "(kosong)"}`)}`);
  if (d.maxDays < d.minDays) redirect("/admin/shipping?error=Estimasi%20maksimum%20harus%20%E2%89%A5%20minimum");

  // Satu kota hanya boleh ada di satu zona (jika tidak, tarif yang dipakai ambigu).
  const clash = await db.shippingRate.findFirst({ where: { cities: { hasSome: cities }, ...(d.id ? { id: { not: d.id } } : {}) } });
  if (clash) redirect(`/admin/shipping?error=${encodeURIComponent(`Kota sudah dipakai zona “${clash.zone}”.`)}`);

  const data = { zone: d.zone, cities, baseFee: d.baseFee, perKgFee: d.perKgFee, minDays: d.minDays, maxDays: d.maxDays, isActive: !!d.isActive };
  try {
    const r = d.id ? await db.shippingRate.update({ where: { id: d.id }, data }) : await db.shippingRate.create({ data });
    await audit(me.id, d.id ? "shipping.update" : "shipping.create", "ShippingRate", r.id, { baseFee: d.baseFee, perKgFee: d.perKgFee });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") redirect("/admin/shipping?error=Nama%20zona%20sudah%20ada");
    throw e;
  }
  revalidatePath("/admin/shipping");
  redirect("/admin/shipping");
}
