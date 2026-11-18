import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/config/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await db.product
    .findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { slug: true, updatedAt: true }, take: 5000 })
    .catch(() => []);
  const staticPaths = ["", "/catalog", "/about", "/how-it-works", "/faq", "/contact", "/policy"];
  return [
    ...site.locales.flatMap((l) => staticPaths.map((p) => ({ url: `${base}/${l}${p}`, changeFrequency: "weekly" as const }))),
    ...products.flatMap((p) => site.locales.map((l) => ({ url: `${base}/${l}/product/${p.slug}`, lastModified: p.updatedAt }))),
  ];
}
