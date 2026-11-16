import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/config/site";
import { waLink } from "@/lib/contact";
import { getMessages } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { TrackForm } from "@/components/track-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).track.title : "Track", robots: { index: false } };
}

export default async function TrackPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  return (
    <>
      <PageHero title={t.track.title} intro={t.track.intro} icon="package" />
      <div className="container-x py-8 sm:py-10"><TrackForm locale={locale} t={t} waHref={waLink()} /></div>
    </>
  );
}
