import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { getSpecDefs } from "@/lib/catalog-cache";
import { cheapestIndexes, COMPARE_MIN, parseSlugs, rowDiffers } from "@/lib/compare";
import { formatIdr, getMessages, pick } from "@/lib/i18n";
import { effectiveAvailability, publicProductSelect } from "@/lib/products";
import { pageMetadata } from "@/lib/seo";
import { AvailabilityBadge } from "@/components/availability-badge";
import { CompareClear, CompareRemove, CompareSync } from "@/components/compare-sync";
import { Icon, categoryIcon } from "@/components/icons";

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale);
  // Halaman buatan pengguna (kombinasi tak terbatas): tidak diindeks.
  return pageMetadata({ locale, path: "/compare", title: t.compare.title, description: t.compare.description, noindex: true });
}

export default async function ComparePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const sp = await searchParams;
  const slugs = parseSlugs(sp.p);
  const onlyDiff = sp.diff === "1";

  const rows = slugs.length
    ? await db.product
        .findMany({ where: { slug: { in: slugs }, status: "PUBLISHED", deletedAt: null }, select: { ...publicProductSelect, attributes: true } })
        .catch(() => [])
    : [];
  // Urutan sesuai URL; produk yang sudah dihapus/disembunyikan otomatis hilang dari perbandingan.
  const products = slugs.flatMap((s) => rows.filter((r) => r.slug === s));
  const live = products.map((p) => p.slug);

  const catSlugs = [...new Set(products.map((p) => p.category.slug))];
  const defsByCat = await Promise.all(catSlugs.map((c) => getSpecDefs(c).catch(() => [])));
  const specRows: Array<{ key: string; label: string; unit: string | null; type: string }> = [];
  for (const defs of defsByCat) for (const d of defs) if (!specRows.some((r) => r.key === d.key)) specRows.push({ key: d.key, label: pick(locale, d.labelId, d.labelEn), unit: d.unit, type: d.type });
  const attr = (p: (typeof products)[number], key: string) => ((p.attributes ?? {}) as Record<string, string | number | boolean | undefined>)[key];
  const fmtSpec = (v: string | number | boolean | null | undefined, type: string, unit: string | null) =>
    v === null || v === undefined || v === "" ? "-" : type === "BOOLEAN" ? (v === true || v === "true" || v === 1 ? t.compare.yes : t.compare.no) : `${v}${unit ? ` ${unit}` : ""}`;

  const prices = products.map((p) => p.sellPrice);
  const cheapest = cheapestIndexes(prices);
  const cond = products.map((p) => t.condition[p.condition]);
  const grade = products.map((p) => (p.grade ? t.grade[p.grade] : null));
  const battery = products.map((p) => p.batteryHealth);
  const avail = products.map((p) => effectiveAvailability(p));

  type Row = { label: string; cells: React.ReactNode[]; differs: boolean; highlight?: number[] };
  const table: Row[] = [
    { label: t.catalog.price, cells: products.map((p) => <b key={p.id}>{formatIdr(p.sellPrice)}</b>), differs: rowDiffers(prices), highlight: cheapest },
    { label: t.catalog.condition, cells: cond, differs: rowDiffers(cond) },
    { label: t.catalog.grade, cells: grade.map((g) => g ?? "-"), differs: rowDiffers(grade) },
    { label: t.product.battery, cells: battery.map((b) => (b != null ? `${b}%` : "-")), differs: rowDiffers(battery) },
    { label: t.compare.availability, cells: products.map((p) => <AvailabilityBadge key={p.id} product={p} t={t} />), differs: rowDiffers(avail) },
    ...specRows.map((r) => {
      const vals = products.map((p) => attr(p, r.key));
      return { label: r.label, cells: vals.map((v) => fmtSpec(v, r.type, r.unit)), differs: rowDiffers(vals) };
    }),
    {
      label: t.compare.features,
      cells: products.map((p) => (p.features.length ? p.features.map((f) => f.replace(/-/g, " ")).join(", ") : "-")),
      differs: rowDiffers(products.map((p) => [...p.features].sort().join(","))),
    },
  ];
  const shown = onlyDiff ? table.filter((r) => r.differs) : table;
  const base = `/${locale}/compare?p=${live.join(",")}`;
  const L = (x: string) => `/${locale}${x}`;

  return (
    <div className="container-x py-8 sm:py-10">
      <CompareSync locale={locale} slugs={slugs} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.compare.title}</h1>
          <p className="muted mt-1 text-sm">{t.compare.description}</p>
        </div>
        {products.length > 0 && <CompareClear locale={locale} label={t.compare.clear} />}
      </div>

      {products.length < COMPARE_MIN ? (
        <div className="card mt-8 grid place-items-center gap-3 p-10 text-center">
          <span className="muted"><Icon name="compare" size={40} /></span>
          <p className="font-bold">{products.length === 0 ? t.compare.empty : t.compare.needMore}</p>
          <p className="muted max-w-sm text-sm">{t.compare.emptyHint}</p>
          <Link href={L("/catalog")} className="btn btn-primary">{t.compare.browse}</Link>
        </div>
      ) : (
        <>
          <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label={t.compare.view}>
            <Link href={base} aria-current={!onlyDiff ? "true" : undefined} className={`chip !min-h-9 ${!onlyDiff ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{t.compare.showAll}</Link>
            <Link href={`${base}&diff=1`} aria-current={onlyDiff ? "true" : undefined} className={`chip !min-h-9 ${onlyDiff ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{t.compare.onlyDiff}</Link>
          </nav>

          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <caption className="sr-only">{t.compare.title}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-28 bg-[var(--card)] p-3 text-left align-bottom sm:w-40"><span className="sr-only">{t.compare.title}</span></th>
                  {products.map((p) => {
                    const img = p.images[0];
                    const name = pick(locale, p.nameId, p.nameEn);
                    const others = live.filter((s) => s !== p.slug);
                    return (
                      <th key={p.id} scope="col" className="min-w-40 border-l border-[var(--line)] p-3 text-left align-top font-normal">
                        <div className="flex items-start justify-between gap-1">
                          <div className="relative aspect-square w-20 overflow-hidden rounded-lg bg-white sm:w-28 dark:bg-[var(--color-ink-800)]">
                            {img ? <Image src={img.url} alt={img.alt ?? name} fill sizes="112px" className="object-contain p-1" /> : <span className="muted grid h-full place-items-center"><Icon name={categoryIcon(p.category.slug)} size={28} /></span>}
                          </div>
                          <CompareRemove locale={locale} slug={p.slug} rest={others} label={t.compare.removeItem.replace("{name}", name)} />
                        </div>
                        <p className="muted mt-2 text-[11px] font-semibold uppercase tracking-wide">{p.brand.name}</p>
                        <Link href={L(`/product/${p.slug}`)} className="line-clamp-3 font-semibold leading-snug underline-offset-4 hover:underline">{name}</Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.label} className="border-t border-[var(--line)]">
                    <th scope="row" className={`sticky left-0 z-10 bg-[var(--card)] p-3 text-left text-xs font-semibold ${r.differs ? "" : "muted"}`}>{r.label}</th>
                    {r.cells.map((c, i) => (
                      <td key={i} className={`border-l border-[var(--line)] p-3 align-top ${r.differs ? "bg-brand-500/[0.04]" : ""} ${r.highlight?.includes(i) ? "font-bold text-green-700 dark:text-green-400" : ""}`}>
                        {c}{r.highlight?.includes(i) && <span className="ml-1 text-[11px] font-semibold">{t.compare.lowest}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={products.length + 1} className="muted p-6 text-center">{t.compare.noDiff}</td></tr>}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--line)]">
                  <td className="sticky left-0 z-10 bg-[var(--card)] p-3" />
                  {products.map((p) => (
                    <td key={p.id} className="border-l border-[var(--line)] p-3">
                      <Link href={L(`/product/${p.slug}#order`)} className="btn btn-primary btn-sm w-full">{t.compare.order}</Link>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="muted mt-3 text-xs">{t.compare.shareHint}</p>
        </>
      )}
    </div>
  );
}
