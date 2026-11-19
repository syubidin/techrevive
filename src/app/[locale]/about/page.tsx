import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { getMessages } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { PageHero } from "@/components/page-hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale);
  return pageMetadata({ locale, path: "/about", title: t.aboutPage.title, description: t.aboutPage.intro });
}

const VALUE_ICONS: IconName[] = ["badge-check", "shield-check", "clock", "wallet"];
const STEP_ICONS: IconName[] = ["search", "message-circle", "package", "truck"];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const a = getMessages(locale).aboutPage;
  const L = (p: string) => `/${locale}${p}`;
  return (
    <>
      <PageHero title={a.title} intro={a.intro} icon="users" />
      <div className="container-x space-y-12 py-8 sm:space-y-16 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="about-story">
          <div>
            <h2 id="about-story" className="text-2xl font-extrabold tracking-tight">{a.storyTitle}</h2>
            <div className="mt-4 space-y-4 leading-relaxed">
              {a.story.map((p) => <p key={p} className="muted max-w-prose">{p}</p>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="card p-5">
              <h3 className="flex items-center gap-2 font-bold"><Icon name="info" size={18} />{a.missionTitle}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{a.mission}</p>
            </article>
            <article className="card p-5">
              <h3 className="flex items-center gap-2 font-bold"><Icon name="search" size={18} />{a.visionTitle}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{a.vision}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="about-values">
          <h2 id="about-values" className="text-2xl font-extrabold tracking-tight">{a.valuesTitle}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => (
              <li key={v.t} className="card p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={VALUE_ICONS[i] ?? "check"} size={22} /></span>
                <h3 className="mt-3 font-bold">{v.t}</h3>
                <p className="muted mt-1 text-sm leading-relaxed">{v.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-process">
          <h2 id="about-process" className="text-2xl font-extrabold tracking-tight">{a.processTitle}</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.process.map((s, i) => (
              <li key={s.t} className="card flex gap-4 p-5 sm:block">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-ink-900)] text-white"><Icon name={STEP_ICONS[i] ?? "check"} size={20} /></span>
                <div className="sm:mt-3">
                  <p className="muted text-xs font-bold uppercase tracking-wide">{i + 1}</p>
                  <h3 className="font-bold">{s.t}</h3>
                  <p className="muted mt-1 text-sm leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{a.ctaTitle}</h2>
            <p className="muted mt-1 max-w-xl text-sm sm:text-base">{a.ctaDesc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={L("/catalog")} className="btn btn-primary">{a.ctaCatalog}<Icon name="arrow-right" size={16} /></Link>
            <Link href={L("/contact")} className="btn btn-ghost">{a.ctaContact}</Link>
          </div>
        </section>
      </div>
    </>
  );
}
