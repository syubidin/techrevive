"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPARE_MIN } from "@/lib/compare";
import { useCompare } from "@/lib/compare-store";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { Icon } from "./icons";

/** Bar melayang di bawah layar saat ada produk yang dipilih. Disembunyikan di halaman bandingkan itu sendiri. */
export function CompareBar({ locale, t }: { locale: Locale; t: Messages }) {
  const { slugs, clear } = useCompare();
  const path = usePathname();
  if (slugs.length === 0 || path.includes("/compare")) return null;
  const ready = slugs.length >= COMPARE_MIN;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]" role="region" aria-label={t.compare.title}>
      <div className="card mx-auto flex max-w-xl items-center gap-3 p-3 shadow-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name="compare" size={20} /></span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold">{t.compare.selected.replace("{n}", String(slugs.length))}</span>
          {!ready && <span className="muted block text-xs">{t.compare.needMore}</span>}
        </p>
        <button type="button" onClick={clear} className="btn btn-ghost btn-sm" aria-label={t.compare.clear}><Icon name="x" size={16} /></button>
        {ready ? (
          <Link href={`/${locale}/compare?p=${slugs.join(",")}`} className="btn btn-primary btn-sm">{t.compare.go}</Link>
        ) : (
          <span className="btn btn-primary btn-sm pointer-events-none opacity-50" aria-disabled="true">{t.compare.go}</span>
        )}
      </div>
    </div>
  );
}
