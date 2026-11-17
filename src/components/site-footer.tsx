import { site, type Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { waLink } from "@/lib/contact";
import { Icon, socialIcon } from "./icons";
import { FooterLink } from "./footer-link";

export function SiteFooter({ locale, t, brands = [] }: { locale: Locale; t: Messages; brands?: Array<{ slug: string; name: string }> }) {
  const socials = site.social.filter((s) => s.url);
  const L = (p: string) => `/${locale}${p}`;
  const col = "text-sm";
  const head = "text-xs font-bold uppercase tracking-wider";
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[var(--card)]">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="text-lg font-extrabold">TechRevive</p>
          <p className="muted mt-2 max-w-xs text-sm">{t.footer.tagline}</p>
          {socials.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.contactPage.socialTitle}>
              {socials.map((s) => (
                <li key={s.key}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="btn btn-ghost footer-social !h-11 !w-11 !p-0">
                    <Icon name={socialIcon(s.key)} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <nav className={col} aria-label={t.footer.shop}>
          <p className={head}>{t.footer.shop}</p>
          <ul className="mt-3 space-y-1">
            <li><FooterLink href={L("/catalog")}>{t.nav.catalog}</FooterLink></li>
            {brands.slice(0, 5).map((b) => (
              <li key={b.slug}><FooterLink href={L(`/catalog?brand=${b.slug}`)} match={false}>{b.name}</FooterLink></li>
            ))}
          </ul>
        </nav>
        <nav className={col} aria-label={t.footer.help}>
          <p className={head}>{t.footer.help}</p>
          <ul className="mt-3 space-y-1">
            <li><FooterLink href={L("/how-it-works")}>{t.nav.howItWorks}</FooterLink></li>
            <li><FooterLink href={L("/faq")}>{t.nav.faq}</FooterLink></li>
            <li><FooterLink href={L("/track")}>{t.nav.track}</FooterLink></li>
            <li><FooterLink href={L("/policy")}>{t.nav.policy}</FooterLink></li>
            <li><FooterLink href={L("/contact")}>{t.nav.contact}</FooterLink></li>
          </ul>
        </nav>
        <div className={col}>
          <p className={head}>{t.nav.contact}</p>
          <ul className="muted mt-3 space-y-2.5">
            <li className="flex gap-2"><Icon name="clock" size={16} className="mt-0.5 shrink-0" />{site.businessHours[locale]}</li>
            <li className="flex gap-2"><Icon name="map-pin" size={16} className="mt-0.5 shrink-0" />{t.trust.area}</li>
            <li className="flex gap-2"><Icon name="shield-check" size={16} className="mt-0.5 shrink-0" />{t.trust.noWarranty}</li>
          </ul>
          <a href={waLink()} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-4"><Icon name="message-circle" size={18} />{t.common.chatWa}</a>
        </div>
      </div>
      <p className="muted border-t border-[var(--line)] py-5 text-center text-xs">&copy; {new Date().getFullYear()} TechRevive. {t.footer.rights}</p>
    </footer>
  );
}
