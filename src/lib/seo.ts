import type { Metadata } from "next";
import { founder } from "@/config/founder";
import { site, type Locale } from "@/config/site";
import { getMessages } from "./i18n";
import { waNumber } from "./contact";

/** URL dasar situs tanpa garis miring di akhir. */
export const siteUrl = (): string => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const abs = (path: string): string => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

const OG_LOCALE: Record<Locale, string> = { id: "id_ID", en: "en_US" };
export const OG_DEFAULT_IMAGE = "/brand/og-default.png";

/** hreflang untuk satu halaman (path tanpa prefix bahasa, mis. "/catalog"). */
export function languageAlternates(path = "", query = ""): Record<string, string> {
  return { id: `/id${path}${query}`, en: `/en${path}${query}`, "x-default": `/${site.defaultLocale}${path}${query}` };
}

interface PageMeta {
  locale: Locale;
  /** Path tanpa prefix bahasa, mis. "/about". String kosong untuk beranda. */
  path?: string;
  title: string;
  description: string;
  images?: string[];
  /** Halaman yang tidak boleh masuk indeks (tetap boleh diikuti linknya). */
  noindex?: boolean;
  ogType?: "website" | "article";
  /** Query string kanonik (mis. "?category=laptop") bila halaman dengan parameter itu memang layak diindeks. */
  canonicalQuery?: string;
}

/** Satu pintu untuk metadata halaman publik: canonical, hreflang, Open Graph, Twitter, dan robots. */
export function pageMetadata({ locale, path = "", title, description, images, noindex, ogType = "website", canonicalQuery = "" }: PageMeta): Metadata {
  const url = `/${locale}${path}${canonicalQuery}`;
  const og = (images?.length ? images : [OG_DEFAULT_IMAGE]).map((u) => ({ url: u, alt: title }));
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path, canonicalQuery) },
    openGraph: { type: ogType, siteName: site.name, title, description, url, locale: OG_LOCALE[locale], alternateLocale: Object.values(OG_LOCALE).filter((l) => l !== OG_LOCALE[locale]), images: og },
    twitter: { card: "summary_large_image", title, description, images: og.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// ---------- JSON-LD (data terstruktur untuk Google dan mesin AI) ----------

const SAME_AS = () => site.social.map((s) => s.url).filter((u) => u && !/^https:\/\/www\.(instagram|tiktok|facebook|youtube)\.com\/?$/.test(u));

export function organizationLd(locale: Locale) {
  const t = getMessages(locale);
  const phone = waNumber();
  const real = phone !== site.placeholderWhatsApp;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}/#organization`,
    name: site.name,
    url: siteUrl(),
    logo: abs("/brand/icon-512.png"),
    description: t.meta.orgDescription,
    areaServed: { "@type": "AdministrativeArea", name: "Jabodetabek" },
    founder: { "@type": "Person", name: founder.name, sameAs: [founder.linkedin] },
    knowsAbout: ["Refurbished laptops", "Second-hand smartphones", "Gadgets", "Device quality control"],
    ...(SAME_AS().length ? { sameAs: SAME_AS() } : {}),
    ...(real ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: `+${phone}`, availableLanguage: ["id", "en"], areaServed: "ID" } } : {}),
  };
}

export function websiteLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    url: abs(`/${locale}`),
    name: site.name,
    inLanguage: locale,
    publisher: { "@id": `${siteUrl()}/#organization` },
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: abs(`/${locale}/catalog?q={search_term_string}`) }, "query-input": "required name=search_term_string" },
  };
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

/** Serialisasi aman untuk <script type="application/ld+json">: "<" di-escape agar tidak bisa menutup tag. */
export const ldJson = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
