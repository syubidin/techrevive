import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, site } from "@/config/site";
import { waLink, waNumber } from "@/lib/contact";
import { getMessages } from "@/lib/i18n";
import { Icon, socialIcon } from "@/components/icons";
import { ContactForm } from "@/components/contact-form";
import { PageHero } from "@/components/page-hero";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: isLocale(locale) ? getMessages(locale).contactPage.title : "Contact" };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const c = getMessages(locale).contactPage;
  const socials = site.social.filter((s) => s.url);
  const info = [
    { icon: "clock" as const, title: c.hoursTitle, body: site.businessHours[locale] },
    { icon: "map-pin" as const, title: c.areaTitle, body: c.areaDesc },
    { icon: "message-circle" as const, title: c.responseTitle, body: c.responseDesc },
  ];
  return (
    <>
      <PageHero title={c.title} intro={c.intro} icon="phone" />
      <div className="container-x grid gap-6 py-8 sm:py-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <ContactForm t={c} waNumber={waNumber()} />
          <a href={waLink(c.waText)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost w-full"><Icon name="message-circle" size={18} />{c.waButton}</a>
        </div>
        <div className="space-y-4">
          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {info.map((i) => (
              <li key={i.title} className="card flex gap-3 p-4">
                <Icon name={i.icon} className="mt-0.5 shrink-0" />
                <div><p className="font-bold">{i.title}</p><p className="muted mt-0.5 text-sm">{i.body}</p></div>
              </li>
            ))}
          </ul>
          <section className="card p-5">
            <h2 className="font-bold">{c.socialTitle}</h2>
            {socials.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.key}><a href={s.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost"><Icon name={socialIcon(s.key)} size={18} />{s.label}</a></li>
                ))}
              </ul>
            ) : <p className="muted mt-2 text-sm">{c.noSocial}</p>}
          </section>
          <section className="card p-5"><h2 className="font-bold">{c.aboutTitle}</h2><p className="muted mt-2 text-sm leading-relaxed">{c.aboutDesc}</p></section>
        </div>
      </div>
    </>
  );
}
