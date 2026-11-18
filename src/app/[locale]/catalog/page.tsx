import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { getCatalogMeta, getSpecDefs } from "@/lib/catalog-cache";
import { formatIdr, getMessages, pick } from "@/lib/i18n";
import { buildCatalogQuery, PAGE_SIZE } from "@/lib/catalog-query";
import { publicProductSelect } from "@/lib/products";
import { CatalogFilters, type SpecFilter } from "@/components/catalog-filters";
import { ProductCard } from "@/components/product-card";
import { FilterSheet } from "@/components/filter-sheet";
import { Icon } from "@/components/icons";
import { buildFilterChips } from "@/lib/filter-chips";

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

  const chips = buildFilterChips(sp);
  const catName = new Map(categories.map((c) => [c.slug, pick(locale, c.nameId, c.nameEn)]));
  const brandName = new Map(brands.map((b) => [b.slug, b.name]));
  const specLabel = new Map(specs.map((x) => [`s.${x.key}`, x.label]));
  const chipLabel = (kind: string, value: string): string => {
    switch (kind) {
      case "category": return catName.get(value) ?? value;
      case "brand": return brandName.get(value) ?? value;
      case "condition": return t.condition[value as "USED" | "REFURBISHED"] ?? value;
      case "grade": return t.grade[value as "A" | "B" | "C"] ?? value;
      case "availability": return t.availabilityShort[value as "CHECK" | "VERIFIED" | "PREORDER"] ?? value;
      case "feature": return value.replace(/-/g, " ");
      case "q": return `"${value}"`;
      case "minPrice": return `${t.catalog.price} \u2265 ${formatIdr(Number(value))}`;
      case "maxPrice": return `${t.catalog.price} \u2264 ${formatIdr(Number(value))}`;
      case "battery": return `${t.catalog.battery} \u2265 ${value}%`;
      default: return `${specLabel.get(kind) ?? kind.replace(/^s\./, "")}: ${value}`;
    }
  };
  const chipHref = (rest: string) => `/${locale}/catalog${rest ? `?${rest}` : ""}`;
  const sortNow = sp.get("sort") ?? "newest";

  return (
    <div className="container-x py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.catalog.title}</h1>
          <p className="muted mt-1 text-sm">{t.catalog.results.replace("{n}", String(total))}</p>
        </div>
        <form method="get" className="flex w-full min-w-0 gap-2 sm:w-auto" role="search">
          {[...sp.entries()].filter(([k]) => k !== "q" && k !== "page").map(([k, v], i) => <input key={`${k}${i}`} type="hidden" name={k} value={v} />)}
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Icon name="search" size={18} className="muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input className="input !pl-10" type="search" name="q" defaultValue={sp.get("q") ?? ""} placeholder={t.catalog.searchPlaceholder} maxLength={60} aria-label={t.catalog.searchLabel} />
          </div>
          <button className="btn btn-primary" type="submit">{t.hero.search}</button>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <FilterSheet title={t.catalog.filters} count={chips.length} closeLabel={t.catalog.closeFilters}>
            <CatalogFilters locale={locale} t={t} sp={sp} categories={categories} brands={brands} features={features} specs={specs} />
          </FilterSheet>
        </aside>

        <section className="min-w-0">
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label={t.catalog.activeFilters}>
              {chips.map((c) => (
                <Link key={c.id} href={chipHref(c.rest)} className="chip bg-[var(--card)] !min-h-9 gap-1.5 pr-2 hover:border-[var(--color-ink-500)]" aria-label={`${t.catalog.clearAll}: ${chipLabel(c.kind, c.value)}`}>
                  {chipLabel(c.kind, c.value)}<Icon name="x" size={14} />
                </Link>
              ))}
              <Link href={`/${locale}/catalog`} className="px-2 text-sm font-semibold underline underline-offset-4">{t.catalog.clearAll}</Link>
            </div>
          )}

          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm" aria-label={t.catalog.sortLabel}>
            <span className="muted flex shrink-0 items-center gap-1"><Icon name="sort" size={16} />{t.catalog.sort}:</span>
            {sortOptions.map(([value, label]) => (
              <Link key={value} href={link({ sort: value, page: "1" })} aria-current={sortNow === value ? "true" : undefined}
                className={`chip shrink-0 !min-h-9 ${sortNow === value ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{label}</Link>
            ))}
          </nav>

          {products.length === 0 ? (
            <div className="card grid place-items-center gap-3 p-10 text-center">
              <span className="muted"><Icon name="search" size={36} /></span>
              <p className="muted">{t.catalog.empty}</p>
              <Link href={`/${locale}/catalog`} className="btn btn-ghost">{t.catalog.reset}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {products.map((p, i) => <ProductCard key={p.id} product={p} locale={locale} t={t} priority={i < 2} />)}
            </div>
          )}

          {pages > 1 && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm" aria-label="Pagination">
              {page > 1 && <Link className="btn btn-ghost" href={link({ page: String(page - 1) })} rel="prev"><Icon name="chevron-left" size={16} />{t.catalog.prev}</Link>}
              <span className="muted">{page} / {pages}</span>
              {page < pages && <Link className="btn btn-ghost" href={link({ page: String(page + 1) })} rel="next">{t.catalog.next}<Icon name="chevron-right" size={16} /></Link>}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
