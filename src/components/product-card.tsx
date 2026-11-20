import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/config/site";
import { formatIdr, pick, type Messages } from "@/lib/i18n";
import type { PublicProduct } from "@/lib/products";
import { AvailabilityBadge } from "./availability-badge";
import { CompareToggle } from "./compare-toggle";
import { Icon, categoryIcon } from "./icons";

/** Kartu produk ringkas: 2 kolom di ponsel, jadi teks & badge dibuat kecil dan label ketersediaan dipendekkan. */
export function ProductCard({ product: p, locale, t, priority }: { product: PublicProduct; locale: Locale; t: Messages; priority?: boolean }) {
  const img = p.images[0];
  const name = pick(locale, p.nameId, p.nameEn);
  return (
    <div className="relative h-full">
    <CompareToggle slug={p.slug} t={t} />
    <Link href={`/${locale}/product/${p.slug}`} className="card hover-lift group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-white dark:bg-[var(--color-ink-800)]">
        {img ? (
          <Image src={img.url} alt={img.alt ?? name} fill priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="object-contain p-1 transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="bg-grid muted absolute inset-0 grid place-items-center" aria-hidden><Icon name={categoryIcon(p.category?.slug ?? "")} size={40} /></div>
        )}
        <span className="chip absolute left-2 top-2 bg-[var(--card)] !text-[11px] sm:left-3 sm:top-3">{t.condition[p.condition]}{p.grade ? ` \u00b7 ${p.grade}` : ""}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3 sm:gap-2 sm:p-4">
        <p className="muted truncate text-xs font-semibold uppercase tracking-wide">{p.brand.name}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{name}</h3>
        <div className="mt-auto flex flex-col gap-1.5 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <p className="min-w-0 break-words text-base font-extrabold sm:text-lg">{formatIdr(p.sellPrice)}</p>
          <AvailabilityBadge product={p} t={t} locale={locale} />
        </div>
      </div>
    </Link>
    </div>
  );
}
