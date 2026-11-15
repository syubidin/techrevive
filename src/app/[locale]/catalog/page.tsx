import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { getCatalogMeta, getSpecDefs } from "@/lib/catalog-cache";
import { getMessages, pick } from "@/lib/i18n";
import { buildCatalogQuery, PAGE_SIZE } from "@/lib/catalog-query";
import { publicProductSelect } from "@/lib/products";
import { CatalogFilters, type SpecFilter } from "@/components/catalog-filters";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic"; // bergantung pada query string

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).catalog.title : "Catalog" };
}

function toParams(raw: SearchParams): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) v.slice(0, 20).forEach((x) => sp.append(k, x));
    else if (v !== undefined) sp.set(k, v);
  }
  return sp;
}

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const sp = toParams(await searchParams);

  // Definisi spek dimuat untuk kategori terpilih (maks 1 kategori) agar filter relevan.
  const selectedCategories = sp.getAll("category").flatMap((c) => c.split(","));
  // Data filter di-cache (jarang berubah); hanya daftar produk yang dihitung ulang tiap permintaan.
  const [meta, specDefs] = await Promise.all([
    getCatalogMeta().catch(() => ({ categories: [], brands: [], features: [] as string[] })),
    selectedCategories.length === 1 ? getSpecDefs(selectedCategories[0]).catch(() => []) : Promise.resolve([]),
  ]);
  const { categories, brands, features } = meta;
  const specs: SpecFilter[] = specDefs.map((d) => ({ key: d.key, label: pick(locale, d.labelId, d.labelEn), type: d.type, unit: d.unit, options: d.options }));

  const { where, orderBy, skip, take, page } = buildCatalogQuery(sp, specDefs.map((d) => ({ key: d.key, type: d.type })));
  const [products, total] = await Promise.all([
    db.product.findMany({ where, orderBy, skip, take, select: publicProductSelect }),
    db.product.count({ where }),
  ]).catch(() => [[], 0] as const);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (patch: Record<string, string>) => {
    const q = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) q.set(k, v);
    return `/${locale}/catalog?${q.toString()}`;
  };
  const sortOptions = [
    ["newest", t.catalog.sortNewest],
    ["price_asc", t.catalog.sortPriceAsc],
    ["price_desc", t.catalog.sortPriceDesc],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.catalog.title}</h1>
          <p className="muted mt-1 text-sm">{t.catalog.results.replace("{n}", String(total))}</p>
        </div>
        <form method="get" className="flex w-full gap-2 sm:w-auto" role="search">
          {[...sp.entries()].filter(([k]) => k !== "q" && k !== "page").map(([k, v], i) => <input key={`${k}${i}`} type="hidden" name={k} value={v} />)}
          <input className="input sm:w-72" type="search" name="q" defaultValue={sp.get("q") ?? ""} placeholder={t.catalog.searchPlaceholder} maxLength={60} aria-label={t.catalog.searchPlaceholder} />
          <button className="btn btn-primary" type="submit">OK</button>
        </form>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="lg:hidden card mb-4 p-0" >
            <summary className="cursor-pointer p-4 font-bold">{t.catalog.filters}</summary>
            <div className="p-2">
              <CatalogFilters locale={locale} t={t} sp={sp} categories={categories} brands={brands} features={features} specs={specs} />
            </div>
          </details>
          <div className="hidden lg:block">
            <CatalogFilters locale={locale} t={t} sp={sp} categories={categories} brands={brands} features={features} specs={specs} />
          </div>
        </aside>

        <section>
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm" aria-label={t.catalog.sort}>
            <span className="muted">{t.catalog.sort}:</span>
            {sortOptions.map(([value, label]) => (
              <Link key={value} href={link({ sort: value, page: "1" })} aria-current={(sp.get("sort") ?? "newest") === value ? "true" : undefined}
                className={`chip ${(sp.get("sort") ?? "newest") === value ? "bg-[var(--color-ink-900)] text-white" : ""}`}>{label}</Link>
            ))}
          </nav>

          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="muted">{t.catalog.empty}</p>
              <Link href={`/${locale}/catalog`} className="btn btn-ghost mt-4">{t.catalog.reset}</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => <ProductCard key={p.id} product={p} locale={locale} t={t} />)}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link className="btn btn-ghost" href={link({ page: String(page - 1) })} rel="prev">← {t.catalog.prev}</Link>}
              <span className="muted">{page} / {pages}</span>
              {page < pages && <Link className="btn btn-ghost" href={link({ page: String(page + 1) })} rel="next">{t.catalog.next} →</Link>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
