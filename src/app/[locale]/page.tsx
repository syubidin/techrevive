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
  const trustChips = t.hero.chips;
  const chipIcons: IconName[] = ["badge-check", "clock", "truck"];

  return (
    <>
      <JsonLd data={[organizationLd(locale), websiteLd(locale)]} />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="hero-glow absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2" aria-hidden />
        <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
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
          <div data-intro className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm">
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
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name="shield-check" size={18} /></span>
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
                        <img src={deliveryUrl(b.logoUrl, "c_fit,w_480,h_200,f_auto,q_auto")} alt="" width={224} height={96} loading="lazy" decoding="async" className="brand-logo" />
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
          <ul data-stagger className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {showcase.categories.map((c) => (
              <li key={c.slug}>
                <Link href={L(`/catalog?category=${c.slug}`)} className="card hover-lift flex h-full flex-col gap-3 p-4 sm:p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={categoryIcon(c.slug)} /></span>
                  <span className="font-bold leading-tight">{pick(locale, c.nameId, c.nameEn)}</span>
                  <span className="muted text-xs">{t.home.products.replace("{n}", String(c.count))}</span>
                </Link>
              </li>
            ))}
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
          <div data-stagger className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} locale={locale} t={t} priority={i < 2} />)}
          </div>
        ) : (
          <p className="muted mt-6">{t.catalog.empty}</p>
        )}
      </section>

      {/* KENAPA KAMI */}
      <section data-reveal className="section container-x">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.whyTitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.home.why.map((w, i) => (
            <div key={w.t} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={t.home.whyIcons[i] as IconName} /></span>
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
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="card relative p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-ink-900)] text-white"><Icon name={t.home.stepIcons[i] as IconName} /></span>
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
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {t.home.grades.map((g) => (
            <div key={g.g} className="card flex gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-ink-900)] text-xl font-extrabold text-white">{g.g}</span>
              <div><h3 className="font-bold">{g.t}</h3><p className="muted mt-1 text-sm leading-relaxed">{g.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ RINGKAS */}
      <section data-reveal className="section container-x">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.faqTitle}</h2>
        <div className="mt-6 grid gap-3 lg:max-w-3xl">
          {t.faqPage.items.slice(0, 4).map((f) => (
            <details key={f.q} className="card group p-4 sm:p-5">
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
        <div className="relative overflow-hidden rounded-3xl bg-[var(--color-ink-900)] p-8 text-white sm:p-12">
          <div className="hero-glow absolute -right-20 -top-20 h-72 w-72 opacity-60" aria-hidden />
          <div className="relative max-w-xl">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.ctaTitle}</h2>
            <p className="mt-3 text-white/75">{t.home.ctaDesc}</p>
            <a href={waLink(t.home.ctaWaText)} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-lg mt-6"><Icon name="message-circle" />{t.home.ctaButton}</a>
          </div>
        </div>
      </section>
    </>
  );
}
