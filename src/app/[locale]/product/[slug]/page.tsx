import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { formatIdr, getMessages, pick } from "@/lib/i18n";
import { effectiveAvailability, publicProductSelect } from "@/lib/products";
import { AvailabilityBadge } from "@/components/availability-badge";
import { InquiryForm } from "@/components/inquiry-form";
import { ProductCard } from "@/components/product-card";
import { Gallery } from "@/components/gallery";
import { Icon, categoryIcon } from "@/components/icons";
import { waLink } from "@/lib/contact";

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

  const catName = pick(locale, p.category.nameId, p.category.nameEn);
  const L = (x: string) => `/${locale}${x}`;
  const facts: Array<{ icon: "tag" | "badge-check" | "battery" | "layers"; label: string; value: string }> = [
    { icon: "layers", label: t.catalog.condition, value: t.condition[p.condition] },
    ...(p.grade ? [{ icon: "badge-check" as const, label: t.catalog.grade, value: t.grade[p.grade] }] : []),
    ...(p.batteryHealth != null ? [{ icon: "battery" as const, label: t.product.battery, value: `${p.batteryHealth}%` }] : []),
    { icon: "tag", label: t.product.sku, value: p.sku },
  ];

  return (
    <div className="container-x py-6 pb-28 sm:py-10 lg:pb-10">
      {/* eslint-disable-next-line react/no-danger -- JSON.stringify output; "<" di-escape agar tidak menutup tag script */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="muted mb-5 flex flex-wrap items-center gap-1 text-sm">
        <Link href={L("")} className="hover:text-[var(--fg)]">{t.common.home}</Link>
        <Icon name="chevron-right" size={14} />
        <Link href={L("/catalog")} className="hover:text-[var(--fg)]">{t.product.breadcrumbCatalog}</Link>
        <Icon name="chevron-right" size={14} />
        <Link href={L(`/catalog?category=${p.category.slug}`)} className="hover:text-[var(--fg)]">{catName}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
        <div>
          <Gallery images={p.images} name={name} placeholderIcon={categoryIcon(p.category.slug)} imageLabel={t.product.image} />

          {desc && <p className="muted mt-8 whitespace-pre-line leading-relaxed">{desc}</p>}

          {attrs.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-bold">{t.product.specs}</h2>
              <dl className="card mt-4 divide-y divide-[var(--line)] text-sm">
                {attrs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-4 px-4 py-3">
                    <dt className="muted capitalize">{k.replace(/_/g, " ")}</dt>
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
                {p.features.map((f) => <li key={f} className="chip"><Icon name="check" size={14} />{f.replace(/-/g, " ")}</li>)}
              </ul>
            </section>
          )}

          <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label={t.product.trustTitle}>
            <div className="card flex gap-3 p-4">
              <Icon name="shield-check" className="mt-0.5 shrink-0 text-green-600" />
              <div><p className="font-bold">{t.product.noWarrantyTitle}</p><p className="muted mt-1 text-sm">{t.trust.noWarranty}</p></div>
            </div>
            <div className="card flex gap-3 p-4">
              <Icon name="truck" className="mt-0.5 shrink-0" />
              <div><p className="font-bold">{t.trust.area}</p><p className="muted mt-1 text-sm">{t.product.shipping}</p></div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div>
            <p className="muted text-xs font-semibold uppercase tracking-wide">{p.brand.name}</p>
            <h1 className="mt-2 text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{name}</h1>
            <div className="mt-3"><AvailabilityBadge product={p} t={t} locale={locale} /></div>
            <p className="mt-4 text-3xl font-extrabold sm:text-4xl">{formatIdr(p.sellPrice)}</p>
            <p className="muted mt-1 text-sm">{t.product.priceNote}</p>
          </div>

          <dl className="card grid grid-cols-2 gap-px overflow-hidden bg-[var(--line)] text-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 bg-[var(--card)] p-3">
                <Icon name={f.icon} size={18} className="muted shrink-0" />
                <div className="min-w-0"><dt className="muted text-xs">{f.label}</dt><dd className="truncate font-semibold">{f.value}</dd></div>
              </div>
            ))}
          </dl>

          <div id="order" className="scroll-mt-24">
            {status === "SOLD_OUT" ? (
              <p className="card p-5 text-sm font-medium">{t.errors.PRODUCT_UNAVAILABLE}</p>
            ) : (
              <InquiryForm productId={p.id} locale={locale} t={t} turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined} />
            )}
          </div>

          <a href={waLink(t.product.askWaText.replace("{name}", name).replace("{sku}", p.sku))} target="_blank" rel="noopener noreferrer" className="btn btn-ghost w-full">
            <Icon name="message-circle" size={18} />{t.product.askWa}
          </a>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="section">
          <h2 className="text-2xl font-extrabold tracking-tight">{t.product.related}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} product={r} locale={locale} t={t} />)}
          </div>
        </section>
      )}

      {/* Bilah CTA lengket (hanya ponsel) */}
      {status !== "SOLD_OUT" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] p-3 backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="container-x flex items-center gap-3 !px-1">
            <div className="min-w-0 flex-1"><p className="truncate text-xs muted">{name}</p><p className="font-extrabold">{formatIdr(p.sellPrice)}</p></div>
            <a href="#order" className="btn btn-primary btn-lg shrink-0">{t.product.orderNow}</a>
          </div>
        </div>
      )}
    </div>
  );
}
