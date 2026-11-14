import type { Prisma } from "@prisma/client";

/**
 * SATU-SATUNYA select yang boleh dipakai halaman publik.
 * Sengaja tidak memuat costPrice, marginType/marginValue, supplierId, atau supplier.
 * Jangan pakai `include` atau select `true` pada Product di kode publik.
 */
export const publicProductSelect = {
  id: true,
  slug: true,
  sku: true,
  nameId: true,
  nameEn: true,
  condition: true,
  grade: true,
  batteryHealth: true,
  sellPrice: true,
  availability: true,
  verifiedAt: true,
  features: true,
  brand: { select: { name: true } },
  category: { select: { slug: true, nameId: true, nameEn: true } },
  images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { url: true, alt: true } },
} satisfies Prisma.ProductSelect;

export type PublicProduct = Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>;

/** Status VERIFIED yang sudah lewat 48 jam dianggap kedaluwarsa lalu ditampilkan sebagai CHECK. */
export const VERIFIED_TTL_MS = 48 * 3600 * 1000;

export function effectiveAvailability(p: Pick<PublicProduct, "availability" | "verifiedAt">, now = Date.now()) {
  if (p.availability === "VERIFIED" && (!p.verifiedAt || now - p.verifiedAt.getTime() > VERIFIED_TTL_MS)) return "CHECK" as const;
  return p.availability;
}
