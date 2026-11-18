import { BrandLogo } from "./brand-logo";
import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { Icon } from "./icons";
import { LocaleSwitch, LocaleSwitchStatic } from "./locale-switch";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

export function SiteHeader({ locale, t }: { locale: Locale; t: Messages }) {
  const links = [
    { href: `/${locale}/catalog`, label: t.nav.catalog, icon: "layers" as const },
    { href: `/${locale}/about`, label: t.nav.about, icon: "users" as const },
    { href: `/${locale}/how-it-works`, label: t.nav.howItWorks, icon: "info" as const },
    { href: `/${locale}/faq`, label: t.nav.faq, icon: "message-circle" as const },
    { href: `/${locale}/track`, label: t.nav.track, icon: "package" as const },
    { href: `/${locale}/contact`, label: t.nav.contact, icon: "phone" as const },
  ];
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-[var(--card)] focus:px-4 focus:py-2 focus:shadow-lg">{t.nav.skip}</a>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-xl">
        <div className="container-x flex h-16 items-center justify-between gap-3">
          <Link href={`/${locale}`} className="flex items-center gap-2.5" aria-label="TechRevive">
            <BrandLogo variant="mark" size={40} className="h-10 w-10" priority />
            <span className="text-lg font-extrabold tracking-tight">TechRevive</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium lg:flex xl:gap-6" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Suspense fallback={<LocaleSwitchStatic locale={locale} />}><LocaleSwitch locale={locale} /></Suspense>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm hidden xl:inline-flex">
              <Icon name="message-circle" size={16} />{t.common.whatsapp}
            </a>
            <MobileMenu links={links} waHref={waLink()} labels={{ open: t.nav.openMenu, close: t.nav.close, wa: t.common.chatWa }} />
          </div>
        </div>
      </header>
    </>
  );
}
