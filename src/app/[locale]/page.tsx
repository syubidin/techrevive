import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand-logo";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, pageMetadata, websiteLd } from "@/lib/seo";
import Link from "next/link";
import { deliveryUrl } from "@/lib/cloudinary-url";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { getShowcase } from "@/lib/catalog-cache";
import { waLink } from "@/lib/contact";
import { db } from "@/lib/db";
import { getMessages, pick } from "@/lib/i18n";
import { publicProductSelect } from "@/lib/products";
import { Icon, categoryIcon, type IconName } from "@/components/icons";
import { HeroSceneLoader } from "@/components/hero-scene-loader";
import { ProductCard } from "@/components/product-card";
import { SearchBox } from "@/components/search-box";
import { Visual } from "@/components/visual";
import { firstAsset, getAsset } from "@/lib/assets";

export const revalidate = 60;

/** Ulang daftar merk sampai minimal 12 entri agar marquee selalu memenuhi lebar layar. */
function cycle<T>(items: T[], min = 12): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  while (out.length < min) out.push(...items);
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale);
  // Judul beranda memakai absolute agar tidak ditambah akhiran "· TechRevive" dua kali.
  const m = pageMetadata({ locale, title: t.meta.homeTitle, description: t.meta.homeDescription });
  return { ...m, title: { absolute: t.meta.homeTitle } };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const L = (p: string) => `/${locale}${p}`;

  // Jika DB belum siap saat build/preview, halaman tetap tampil tanpa produk.
  const [products, showcase] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: publicProductSelect, orderBy: { createdAt: "desc" }, take: 8 }).catch(() => []),
    getShowcase().catch(() => ({ brands: [], categories: [] })),
  ]);
  const marquee = cycle(showcase.brands);
  const cmp = t.home.compare;
  const trustChips = t.hero.chips;
  const chipIcons: IconName[] = ["badge-check", "clock", "truck"];

  return (
    <>
      <JsonLd data={[organizationLd(locale), websiteLd(locale)]} />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Visual k="hero/hero-backdrop" sizes="100vw" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]" />
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="hero-glow absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2" aria-hidden />
        <div className="container-x relative grid items-center gap-6 py-8 sm:gap-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div data-intro>
            <span className="chip bg-[var(--card)]"><Icon name="badge-check" size={14} />{t.hero.badge}</span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{t.hero.title}</h1>
            <p className="muted mt-4 max-w-xl text-base sm:text-lg">{t.hero.subtitle}</p>
            <form action={L("/catalog")} method="get" role="search" className="mt-7 flex max-w-xl gap-2">
              <SearchBox id="hero-q" locale={locale} t={t} placeholder={t.hero.searchPlaceholder} label={t.hero.search} />
              <button type="submit" className="btn btn-primary">{t.hero.search}</button>
            </form>
            <ul className="mt-6 flex flex-wrap gap-2">
              {trustChips.map((c, i) => (
                <li key={c} className="chip bg-[var(--card)]"><Icon name={chipIcons[i] ?? "check"} size={14} />{c}</li>
              ))}
            </ul>
          </div>
          <div data-intro className="relative mx-auto w-full max-w-[10.5rem] sm:max-w-sm">
            {/* Bola 3D (inset-0 lalu diskalakan dari tengah) dan logo mengisi kotak persegi yang SAMA, jadi pusatnya pasti satu titik. */}
            <div data-float className="relative aspect-square">
              <div className="pointer-events-none absolute inset-0 hidden origin-center scale-[1.3] opacity-60 lg:block" aria-hidden><HeroSceneLoader /></div>
              <BrandLogo variant="full" size={420} alt="TechRevive" priority className="relative block h-full w-full object-contain" />
            </div>
            <div className="card absolute -left-2 -top-3 hidden sm:flex items-center gap-2.5 p-3 sm:-left-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-600/10 text-green-700 dark:text-green-300"><Icon name="badge-check" size={18} /></span>
              <div><p className="text-sm font-bold">{t.hero.floatA}</p><p className="muted text-xs">{t.hero.floatAd}</p></div>
            </div>
            <div className="card absolute -bottom-3 -right-2 hidden sm:flex items-center gap-2.5 p-3 sm:-right-6">
              <span className="icon-tile !h-9 !w-9 !rounded-lg"><Icon name="shield-check" size={18} /></span>
              <div><p className="text-sm font-bold">{t.hero.floatB}</p><p className="muted text-xs">{t.hero.floatBd}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* MERK */}
      {marquee.length > 0 && (
        <section aria-labelledby="brands-h" className="border-y border-[var(--line)] py-8">
          <div className="container-x mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="brands-h" className="text-xl font-extrabold tracking-tight sm:text-2xl">{t.home.brandsTitle}</h2>
            <p className="muted text-sm">{t.home.brandsSub}</p>
          </div>
          <div className="marquee">
            <ul className="marquee-track gap-8 pr-8 sm:gap-14 sm:pr-14">
              {[0, 1].map((copy) =>
                marquee.map((b, i) => (
                  <li key={`${copy}-${i}`} aria-hidden={copy === 1 ? true : undefined}>
                    <Link href={L(`/catalog?brand=${b.slug}`)} tabIndex={copy === 1 ? -1 : undefined} title={b.name} aria-label={copy === 1 ? undefined : b.name} className="brand-tile">
                      {b.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={deliveryUrl(b.logoUrl, "c_fit,w_480,h_200,f_webp,q_auto")} alt="" width={224} height={96} loading="lazy" decoding="async" draggable={false} className="brand-logo" />
                      ) : (
                        <span className="brand-name">{b.name}</span>
                      )}
                    </Link>
                  </li>
                )),
              )}
            </ul>
          </div>
        </section>
      )}


      {/* KATEGORI */}
      {showcase.categories.length > 0 && (
        <section data-reveal className="section container-x">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.categoriesTitle}</h2>
          <ul data-stagger className="snap-row mt-5 grid grid-cols-2 gap-3 [--snap-w:62%] sm:mt-6 sm:gap-4 md:grid-cols-4">
            {showcase.categories.map((c) => {
              const imgKey = firstAsset(`categories/${c.slug}`, "categories/default");
              return (
                <li key={c.slug}>
                  <Link href={L(`/catalog?category=${c.slug}`)} className="card hover-lift group flex h-full flex-col gap-3 p-3 sm:p-4">
                    {imgKey ? (
                      <span className="block overflow-hidden rounded-xl bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-900)]">
                        <Visual k={imgKey} sizes="(min-width: 768px) 25vw, 50vw" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </span>
                    ) : (
                      <span className="icon-tile m-1"><Icon name={categoryIcon(c.slug)} /></span>
                    )}
                    <span className="px-1 font-bold leading-tight">{pick(locale, c.nameId, c.nameEn)}</span>
                    <span className="muted px-1 pb-1 text-xs">{t.home.products.replace("{n}", String(c.count))}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* PRODUK UNGGULAN */}
      <section data-reveal className="section container-x">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.featured}</h2>
          <Link href={L("/catalog")} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">{t.home.viewAll}<Icon name="arrow-right" size={16} /></Link>
        </div>
        {products.length > 0 ? (
          <div data-stagger className="snap-row mt-5 grid grid-cols-2 gap-3 [--snap-w:58%] sm:mt-6 sm:gap-5 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} locale={locale} t={t} priority={i < 2} />)}
          </div>
        ) : (
          <p className="muted mt-6">{t.catalog.empty}</p>
        )}
      </section>

      {/* PERBANDINGAN PRODUK */}
      <section data-reveal aria-labelledby="compare-h" className="section container-x">
        <div className="card grid items-center gap-6 overflow-hidden p-5 sm:gap-8 sm:p-10 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <span className="chip bg-[var(--card)]"><Icon name="compare" size={14} />{cmp.chip}</span>
            <h2 id="compare-h" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{cmp.title}</h2>
            <p className="muted mt-3 max-w-lg">{cmp.sub}</p>
            <ul className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
              {cmp.points.map((p) => (
                <li key={p.t} className="flex gap-3">
                  <span className="icon-tile mt-0.5 !h-8 !w-8 !rounded-lg"><Icon name="check" size={16} /></span>
                  <div><p className="font-bold">{p.t}</p><p className="muted text-sm leading-relaxed max-sm:hidden">{p.d}</p></div>
                </li>
              ))}
            </ul>
            <Link href={L("/catalog")} className="btn btn-primary mt-5 w-full sm:mt-6 sm:w-auto"><Icon name="compare" size={18} />{cmp.cta}</Link>
          </div>
          <figure className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg)]">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left">
                    <th scope="col" className="w-[28%] p-3"><span className="sr-only">{cmp.rowSpec}</span></th>
                    <th scope="col" className="p-3 font-bold">{cmp.unitA}</th>
                    <th scope="col" className="p-3 font-bold">{cmp.unitB}</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.rows.map((r) => (
                    <tr key={r.l} className="border-b border-[var(--line)] last:border-0">
                      <th scope="row" className="muted p-2.5 text-left text-xs font-semibold sm:p-3">{r.l}</th>
                      {[r.a, r.b].map((v, i) => (
                        <td key={i} className={`p-2.5 sm:p-3 ${r.best === i ? "bg-brand-500/10 font-bold text-brand-700 dark:text-brand-300" : ""}`}>
                          <span className="inline-flex items-center gap-1.5">{v}{r.best === i && <><Icon name="badge-check" size={14} /><span className="sr-only">{cmp.best}</span></>}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <figcaption className="muted mt-3 text-xs">{cmp.note}</figcaption>
          </figure>
        </div>
      </section>

      {/* KENAPA KAMI */}
      <section data-reveal className="section container-x">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.whyTitle}</h2>
        <div className="snap-row mt-5 grid gap-4 [--snap-w:80%] sm:mt-6 md:grid-cols-3">
          {t.home.why.map((w, i) => (
            <div key={w.t} className="card overflow-hidden p-6">
              <Visual k={["trust/why-grade", "trust/why-qc", "trust/why-human"][i] ?? ""} sizes="(min-width: 768px) 33vw, 100vw" className="-mx-6 -mt-6 mb-5 aspect-[4/3] w-[calc(100%+3rem)] max-w-none object-cover" />
              <span className="icon-tile"><Icon name={t.home.whyIcons[i] as IconName} /></span>
              <h3 className="mt-4 font-bold">{w.t}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="how" data-reveal className="section container-x scroll-mt-24">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.stepsTitle}</h2>
          <Link href={L("/how-it-works")} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">{t.home.viewAll}<Icon name="arrow-right" size={16} /></Link>
        </div>
        <ol className="snap-row mt-5 grid gap-4 [--snap-w:74%] sm:mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="card relative overflow-hidden p-6">
              <Visual k={`process/step-${i + 1}`} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="-mx-6 -mt-6 mb-5 aspect-[4/3] w-[calc(100%+3rem)] max-w-none object-cover" />
              <div className="flex items-center justify-between">
                <span className="icon-tile-solid"><Icon name={t.home.stepIcons[i] as IconName} /></span>
                <span className="text-4xl font-extrabold text-[var(--color-ink-200)] dark:text-[var(--color-ink-700)]">{i + 1}</span>
              </div>
              <h3 className="mt-4 font-bold">{s.t}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* GRADE */}
      <section data-reveal className="section container-x">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.gradeTitle}</h2>
        <p className="muted mt-2 max-w-2xl">{t.home.gradeSub}</p>
        <div className="snap-row mt-5 grid gap-4 [--snap-w:80%] sm:mt-6 md:grid-cols-3">
          {t.home.grades.map((g) => (
            <div key={g.g} className="card overflow-hidden p-5">
              <Visual k={`grades/grade-${g.g.toLowerCase()}`} sizes="(min-width: 768px) 33vw, 100vw" className="-mx-5 -mt-5 mb-4 aspect-[4/3] w-[calc(100%+2.5rem)] max-w-none object-cover" />
              <div className="flex gap-4">
                <span className="icon-tile-solid !h-12 !w-12 text-xl font-extrabold">{g.g}</span>
                <div><h3 className="font-bold">{g.t}</h3><p className="muted mt-1 text-sm leading-relaxed">{g.d}</p></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ RINGKAS */}
      <section data-reveal className="section container-x">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.faqTitle}</h2>
        <div className="mt-6 grid gap-3 lg:max-w-3xl">
          {t.faqPage.items.slice(0, 4).map((f, i) => (
            <details key={f.q} className={`card group p-4 sm:p-5 ${i >= 3 ? "max-sm:hidden" : ""}`}>
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {f.q}<Icon name="chevron-down" size={18} className="chev muted shrink-0" />
              </summary>
              <p className="muted mt-3 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <Link href={L("/faq")} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold hover:underline">{t.home.faqAll}<Icon name="arrow-right" size={16} /></Link>
      </section>

      {/* CTA */}
      <section data-reveal className="container-x section">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[var(--color-ink-900)] text-white">
          <div className="hero-glow absolute -right-20 -top-20 -z-10 h-72 w-72 opacity-60" aria-hidden />
          <div className={`grid ${getAsset("cta/banner") ? "md:grid-cols-[1.05fr_0.95fr]" : ""}`}>
            {getAsset("cta/banner") && (
              <div className="relative order-first overflow-hidden md:order-last">
                <Visual k="cta/banner" sizes="(min-width: 1280px) 560px, (min-width: 768px) 45vw, 100vw" className="aspect-[16/9] w-full object-cover sm:aspect-[16/10] md:absolute md:inset-0 md:aspect-auto md:h-full" />
                <div className="cta-fade pointer-events-none absolute inset-0" aria-hidden />
              </div>
            )}
            <div className="relative p-6 sm:p-12 md:py-14">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.ctaTitle}</h2>
              <p className="mt-3 max-w-md text-white/75">{t.home.ctaDesc}</p>
              <a href={waLink(t.home.ctaWaText)} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-lg mt-6"><Icon name="message-circle" />{t.home.ctaButton}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
