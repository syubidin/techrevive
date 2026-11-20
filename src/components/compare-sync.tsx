"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCompare } from "@/lib/compare-store";
import type { Locale } from "@/config/site";
import { Icon } from "./icons";

/**
 * Menyelaraskan daftar di browser dengan URL. Tanpa ?p= (mis. dibuka dari penanda) dan ada pilihan tersimpan,
 * pengguna diarahkan ke URL yang bisa dibagikan. Dengan ?p=, daftar tersimpan mengikuti URL.
 */
export function CompareSync({ locale, slugs }: { locale: Locale; slugs: string[] }) {
  const router = useRouter();
  const store = useCompare();
  const key = slugs.join(",");
  const saved = store.slugs.join(",");
  useEffect(() => {
    if (key) { if (key !== saved) store.set(slugs); }
    else if (saved) router.replace(`/${locale}/compare?p=${saved}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export function CompareRemove({ locale, slug, rest, label }: { locale: Locale; slug: string; rest: string[]; label: string }) {
  const router = useRouter();
  const { remove } = useCompare();
  return (
    <button
      type="button" aria-label={label} title={label}
      className="btn btn-ghost btn-sm !min-h-9 !px-2"
      onClick={() => { remove(slug); router.replace(rest.length ? `/${locale}/compare?p=${rest.join(",")}` : `/${locale}/compare`); }}
    >
      <Icon name="x" size={16} />
    </button>
  );
}

export function CompareClear({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const { clear } = useCompare();
  return <button type="button" className="btn btn-ghost btn-sm" onClick={() => { clear(); router.replace(`/${locale}/compare`); }}><Icon name="trash" size={16} />{label}</button>;
}
