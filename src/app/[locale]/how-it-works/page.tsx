import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { getMessages } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { PageHero } from "@/components/page-hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).howPage.title : "How to order" };
}

export default async function HowPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const h = t.howPage;
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <PageHero title={h.title} intro={h.intro} icon="info" />
      <div className="container-x grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.4fr_1fr]">
        <ol className="space-y-4">
          {h.steps.map((s, i) => (
            <li key={s.t} className="card flex gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-ink-900)] text-white"><Icon name={h.stepIcons[i] as IconName} /></span>
              <div>
                <p className="muted text-xs font-bold uppercase tracking-wide">{i + 1}</p>
                <h2 className="font-bold">{s.t}</h2>
                <p className="muted mt-1 text-sm leading-relaxed">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><Icon name="wallet" size={18} />{h.payTitle}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">{h.pay.map((p) => <li key={p} className="chip">{p}</li>)}</ul>
            <p className="muted mt-3 text-sm">{h.payNote}</p>
          </section>
          <section className="card p-5">
            <h2 className="flex items-center gap-2 font-bold"><Icon name="truck" size={18} />{h.deliveryTitle}</h2>
            <ul className="muted mt-3 space-y-2 text-sm">
              {h.delivery.map((d) => <li key={d} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0" />{d}</li>)}
            </ul>
          </section>
          <section className="card flex gap-3 p-5">
            <Icon name="alert" className="mt-0.5 shrink-0 text-amber-600" />
            <div><p className="font-bold">{t.product.noWarrantyTitle}</p><p className="muted mt-1 text-sm">{t.trust.noWarranty}</p></div>
          </section>
          <div className="flex flex-wrap gap-2">
            <Link href={L("/catalog")} className="btn btn-primary">{h.cta}<Icon name="arrow-right" size={16} /></Link>
            <Link href={L("/track")} className="btn btn-ghost">{h.trackCta}</Link>
          </div>
        </div>
      </div>
    </>
  );
}
