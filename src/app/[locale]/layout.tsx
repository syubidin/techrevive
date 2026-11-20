import { notFound } from "next/navigation";
import { isLocale, site } from "@/config/site";
import { getMessages } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareBar } from "@/components/compare-bar";
import { MotionRoot } from "@/components/motion-root";
import { getShowcase } from "@/lib/catalog-cache";
import { jakarta, rootMetadata, rootViewport } from "@/lib/root";
import "../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export function generateStaticParams() {
  return site.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getMessages(locale);
  const { brands } = await getShowcase().catch(() => ({ brands: [] as Array<{ slug: string; name: string }> }));
  return (
    <html lang={locale} className={jakarta.variable}>
      <body>
        <MotionRoot />
        <SiteHeader locale={locale} t={t} />
        <main id="content">{children}</main>
        <SiteFooter locale={locale} t={t} brands={brands} />
        <CompareBar locale={locale} t={t} />
      </body>
    </html>
  );
}
