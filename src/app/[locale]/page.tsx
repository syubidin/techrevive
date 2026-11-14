import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { db } from "@/lib/db";
import { getMessages } from "@/lib/i18n";
import { publicProductSelect } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);

  // Jika DB belum siap saat build/preview, halaman tetap tampil tanpa produk.
  const products = await db.product
    .findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: publicProductSelect, orderBy: { createdAt: "desc" }, take: 8 })
    .catch(() => []);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" aria-hidden />
        <div className="absolute -top-32 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div className="animate-rise">
            <span className="chip bg-[var(--card)]">✦ {t.hero.badge}</span>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{t.hero.title}</h1>
            <p className="muted mt-5 max-w-xl text-lg">{t.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/catalog`} className="btn btn-primary">{t.hero.browse}</Link>
              <Link href="#how" className="btn btn-ghost">{t.hero.how}</Link>
            </div>
            <ul className="muted mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li>✓ {t.trust.sla}</li>
              <li>✓ {t.trust.area}</li>
            </ul>
          </div>
          <div className="animate-float relative mx-auto aspect-square w-full max-w-sm">
            <div className="card absolute inset-0 grid place-items-center overflow-hidden bg-white p-6">
              <Image src="/logo.jpg" alt="TechRevive" width={420} height={420} priority className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.featured}</h2>
          <Link href={`/${locale}/catalog`} className="text-sm font-semibold underline underline-offset-4">{t.home.viewAll}</Link>
        </div>
        {products.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} locale={locale} t={t} />)}
          </div>
        ) : (
          <p className="muted mt-8">{t.catalog.empty}</p>
        )}
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.whyTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {t.home.why.map((w) => (
            <div key={w.t} className="card p-6">
              <h3 className="font-bold">{w.t}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto mt-24 max-w-7xl scroll-mt-24 px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.home.stepsTitle}</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {t.home.steps.map((s, i) => (
            <li key={s.t} className="card relative p-6">
              <span className="text-5xl font-extrabold text-[var(--color-ink-200)] dark:text-[var(--color-ink-700)]">{i + 1}</span>
              <h3 className="mt-3 font-bold">{s.t}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
