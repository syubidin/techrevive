import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { formatIdr, getMessages, pick } from "@/lib/i18n";
import { effectiveAvailability, publicProductSelect } from "@/lib/products";
import { AvailabilityBadge } from "@/components/availability-badge";
import { InquiryForm } from "@/components/inquiry-form";
import { ProductCard } from "@/components/product-card";

export const revalidate = 60;

const slugRe = /^[a-z0-9][a-z0-9-]{0,99}$/;

const load = cache(async (slug: string) => {
  if (!slugRe.test(slug)) return null;
  return db.product
    .findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      select: {
        ...publicProductSelect,
        descriptionId: true,
        descriptionEn: true,
        attributes: true,
        categoryId: true,
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], select: { url: true, alt: true } },
      },
    })
    .catch(() => null);
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const p = await load(slug);
  if (!p) return {};
  const name = pick(locale, p.nameId, p.nameEn);
  return {
    title: name,
    description: (pick(locale, p.descriptionId, p.descriptionEn) || name).slice(0, 155),
    alternates: { languages: { id: `/id/product/${slug}`, en: `/en/product/${slug}` } },
    openGraph: { title: name, images: p.images[0] ? [p.images[0].url] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const p = await load(slug);
  if (!p) notFound();
  const t = getMessages(locale);
  const name = pick(locale, p.nameId, p.nameEn);
  const desc = pick(locale, p.descriptionId, p.descriptionEn);
  const status = effectiveAvailability(p);
  const attrs = Object.entries((p.attributes ?? {}) as Record<string, string | number | boolean>);

  const related = await db.product
    .findMany({ where: { status: "PUBLISHED", deletedAt: null, categoryId: p.categoryId, id: { not: p.id } }, select: publicProductSelect, take: 4, orderBy: { createdAt: "desc" } })
    .catch(() => []);

  // JSON-LD: availability sengaja tidak dinyatakan InStock kecuali sudah terverifikasi.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.sku,
    brand: { "@type": "Brand", name: p.brand.name },
    itemCondition: p.condition === "REFURBISHED" ? "https://schema.org/RefurbishedCondition" : "https://schema.org/UsedCondition",
    image: p.images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: p.sellPrice,
      availability: status === "VERIFIED" ? "https://schema.org/InStock" : status === "PREORDER" ? "https://schema.org/PreOrder" : status === "SOLD_OUT" ? "https://schema.org/OutOfStock" : "https://schema.org/LimitedAvailability",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* eslint-disable-next-line react/no-danger -- JSON.stringify output; "<" di-escape agar tidak menutup tag script */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="card relative aspect-[4/3] overflow-hidden bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-800)]">
            {p.images[0] ? (
              <Image src={p.images[0].url} alt={p.images[0].alt ?? name} fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" />
            ) : (
              <div className="bg-grid absolute inset-0 grid place-items-center text-6xl opacity-60" aria-hidden>💻</div>
            )}
          </div>
          {p.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-4 gap-3">
              {p.images.slice(1, 5).map((img) => (
                <li key={img.url} className="card relative aspect-square overflow-hidden">
                  <Image src={img.url} alt={img.alt ?? name} fill sizes="15vw" className="object-cover" />
                </li>
              ))}
            </ul>
          )}

          {desc && <p className="muted mt-8 whitespace-pre-line leading-relaxed">{desc}</p>}

          {attrs.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold">{t.product.specs}</h2>
              <dl className="card mt-4 divide-y divide-[var(--line)] text-sm">
                {attrs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-4 px-4 py-3">
                    <dt className="muted">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-medium">{typeof v === "boolean" ? (v ? t.product.yes : t.product.no) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {p.features.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold">{t.product.features}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.features.map((f) => <li key={f} className="chip">{f.replace(/-/g, " ")}</li>)}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="muted text-xs font-semibold uppercase tracking-wide">{p.brand.name} · {t.product.sku} {p.sku}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">{name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip">{t.condition[p.condition]}</span>
              {p.grade && <span className="chip">{t.grade[p.grade]}</span>}
              {p.batteryHealth != null && <span className="chip">{t.product.battery} {p.batteryHealth}%</span>}
              <AvailabilityBadge product={p} t={t} locale={locale} />
            </div>
            <p className="mt-5 text-4xl font-extrabold">{formatIdr(p.sellPrice)}</p>
            <p className="muted mt-2 text-sm">{t.product.shipping}</p>
          </div>

          {status === "SOLD_OUT" ? (
            <p className="card p-5 text-sm font-medium">{t.errors.PRODUCT_UNAVAILABLE}</p>
          ) : (
            <InquiryForm productId={p.id} locale={locale} t={t} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined} />
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-extrabold tracking-tight">{t.product.related}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} locale={locale} t={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
