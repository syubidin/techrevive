import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { getMessages } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getMessages(locale);
  return pageMetadata({ locale, path: "/policy", title: t.policy.title, description: t.meta.homeDescription });
}

export default async function PolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">{t.policy.title}</h1>
      <div className="mt-10 space-y-8">
        {t.policy.sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-xl font-bold">{s.t}</h2>
            <p className="muted mt-2 leading-relaxed">{s.d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
