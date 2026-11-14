import Link from "next/link";
import { site, type Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";

export function SiteFooter({ locale, t }: { locale: Locale; t: Messages }) {
  const socials = site.social.filter((s) => s.url);
  return (
    <footer className="mt-24 border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold">TechRevive</p>
          <p className="muted mt-2 max-w-xs text-sm">{site.tagline[locale]}</p>
          {socials.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={locale === "id" ? "Sosial media" : "Social media"}>
              {socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="chip transition hover:bg-[var(--color-ink-100)] hover:text-[var(--color-ink-900)]">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-sm">
          <p className="font-semibold">{t.nav.policy}</p>
          <ul className="muted mt-3 space-y-2">
            <li>{t.trust.noWarranty}</li>
            <li>{t.trust.area}</li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">{t.nav.contact}</p>
          <ul className="muted mt-3 space-y-2">
            <li>{t.trust.sla}</li>
            <li>{site.businessHours[locale]}</li>
            <li><Link href={`/${locale}/policy`} className="underline underline-offset-4">{t.nav.policy}</Link></li>
          </ul>
        </div>
      </div>
      <p className="muted border-t border-[var(--line)] py-5 text-center text-xs">© {new Date().getFullYear()} TechRevive. {t.footer.rights}</p>
    </footer>
  );
}
