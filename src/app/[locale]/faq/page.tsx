import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { waLink } from "@/lib/contact";
import { getMessages } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { PageHero } from "@/components/page-hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).faqPage.title : "FAQ" };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const f = t.faqPage;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: f.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- JSON.stringify output; "<" di-escape */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero title={f.title} intro={f.intro} icon="message-circle" />
      <div className="container-x grid gap-8 py-8 sm:py-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-3">
          {f.items.map((i) => (
            <details key={i.q} className="card p-4 sm:p-5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {i.q}<Icon name="chevron-down" size={18} className="chev muted shrink-0" />
              </summary>
              <p className="muted mt-3 text-sm leading-relaxed">{i.a}</p>
            </details>
          ))}
        </div>
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">{f.stillAsk}</h2>
          <p className="muted text-sm">{f.stillAskDesc}</p>
          <a href={waLink(t.contactPage.waText)} target="_blank" rel="noopener noreferrer" className="btn btn-accent w-full"><Icon name="message-circle" size={18} />{t.common.chatWa}</a>
        </aside>
      </div>
    </>
  );
}
