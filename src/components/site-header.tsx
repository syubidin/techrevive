import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { LocaleSwitch, LocaleSwitchStatic } from "./locale-switch";

export function SiteHeader({ locale, t }: { locale: Locale; t: Messages }) {
  const links = [
    { href: `/${locale}/catalog`, label: t.nav.catalog },
    { href: `/${locale}#how`, label: t.nav.howItWorks },
    { href: `/${locale}/policy`, label: t.nav.policy },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5" aria-label="TechRevive">
          <Image src="/logo.jpg" alt="" width={36} height={36} className="rounded-lg mix-blend-multiply dark:mix-blend-normal dark:rounded-lg dark:bg-white" priority />
          <span className="text-lg font-extrabold tracking-tight">TechRevive</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="muted transition hover:text-[var(--fg)]">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Suspense fallback={<LocaleSwitchStatic locale={locale} />}><LocaleSwitch locale={locale} /></Suspense>
          <Link href={`/${locale}/catalog`} className="btn btn-primary hidden sm:inline-flex">{t.hero.browse}</Link>
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-2 text-sm font-medium md:hidden" aria-label="Main mobile">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="muted whitespace-nowrap">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
