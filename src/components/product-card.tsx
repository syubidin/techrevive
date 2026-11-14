import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/config/site";
import { formatIdr, pick, type Messages } from "@/lib/i18n";
import type { PublicProduct } from "@/lib/products";
import { AvailabilityBadge } from "./availability-badge";

export function ProductCard({ product: p, locale, t }: { product: PublicProduct; locale: Locale; t: Messages }) {
  const img = p.images[0];
  const name = pick(locale, p.nameId, p.nameEn);
  return (
    <Link
      href={`/${locale}/product/${p.slug}`}
      className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-800)]">
        {img ? (
          <Image src={img.url} alt={img.alt ?? name} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="bg-grid absolute inset-0 grid place-items-center text-4xl opacity-60" aria-hidden>💻</div>
        )}
        <span className="chip absolute left-3 top-3 bg-[var(--card)]">{t.condition[p.condition]}{p.grade ? ` · ${p.grade}` : ""}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="muted text-xs font-semibold uppercase tracking-wide">{p.brand.name}</p>
        <h3 className="line-clamp-2 font-semibold leading-snug">{name}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p className="text-lg font-extrabold">{formatIdr(p.sellPrice)}</p>
          <AvailabilityBadge product={p} t={t} locale={locale} />
        </div>
      </div>
    </Link>
  );
}
