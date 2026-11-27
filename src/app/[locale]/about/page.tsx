import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { getMessages } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { PageHero } from "@/components/page-hero";
import { Visual } from "@/components/visual";
import { founder } from "@/config/founder";
import { getAsset } from "@/lib/assets";

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
        <Visual k="about/workshop" alt={a.workshopAlt} priority sizes="(min-width: 1280px) 1200px, 100vw" className="aspect-[3/2] w-full rounded-3xl object-cover sm:aspect-[2/1]" />
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="about-story">
          <div>
            <h2 id="about-story" className="text-2xl font-extrabold tracking-tight">{a.storyTitle}</h2>
            <div className="mt-4 space-y-4 leading-relaxed">
              {a.story.map((p) => <p key={p} className="muted max-w-prose">{p}</p>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="card p-5">
              <div className="flex items-center gap-3"><span className="icon-tile"><Icon name="info" size={22} /></span><h3 className="font-bold">{a.missionTitle}</h3></div>
              <p className="muted mt-3 text-sm leading-relaxed">{a.mission}</p>
            </article>
            <article className="card p-5">
              <div className="flex items-center gap-3"><span className="icon-tile"><Icon name="search" size={22} /></span><h3 className="font-bold">{a.visionTitle}</h3></div>
              <p className="muted mt-3 text-sm leading-relaxed">{a.vision}</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="about-founder" className="card grid items-center gap-6 p-5 sm:gap-8 sm:p-8 md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr]">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[16rem] overflow-hidden rounded-2xl bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-800)] md:max-w-none">
            {getAsset(founder.photoKey) ? (
              <Visual k={founder.photoKey} alt={a.founder.photoAlt} sizes="(min-width: 768px) 288px, 256px" className="h-full w-full object-cover object-top" />
            ) : (
              <span style={{ background: "linear-gradient(135deg, var(--color-ink-800), var(--color-ink-950))" }} className="absolute inset-0 grid place-items-center text-5xl font-extrabold tracking-tight text-[var(--color-brand-300)]" role="img" aria-label={a.founder.photoAlt}>{founder.initials}</span>
            )}
          </div>
          <div>
            <p className="eyebrow">{a.founder.title}</p>
            <h2 id="about-founder" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{founder.name}</h2>
            <p className="chip mt-3 bg-[var(--card)]"><Icon name="badge-check" size={14} />{a.founder.role}</p>
            <div className="mt-4 space-y-3">
              {a.founder.bio.map((p) => <p key={p} className="muted max-w-prose leading-relaxed">{p}</p>)}
            </div>
            <a href={founder.linkedin} target="_blank" rel="noopener noreferrer me" className="btn btn-ghost mt-5"><Icon name="linkedin" size={18} />{a.founder.linkedin}</a>
          </div>
        </section>

        <section aria-labelledby="about-values">
          <h2 id="about-values" className="text-2xl font-extrabold tracking-tight">{a.valuesTitle}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {a.values.map((v, i) => (
              <li key={v.t} className="card p-5">
                <span className="icon-tile"><Icon name={VALUE_ICONS[i] ?? "check"} size={22} /></span>
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
              <li key={s.t} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="icon-tile-solid"><Icon name={STEP_ICONS[i] ?? "check"} size={22} /></span>
                  <span className="step-no" aria-label={`${i + 1}`}>{i + 1}</span>
                </div>
                <div className="mt-4">
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
