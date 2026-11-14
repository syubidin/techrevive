"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/config/site";

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const qs = useSearchParams()?.toString();
  const rest = pathname.replace(/^\/(id|en)/, "") || "";
  const href = (l: Locale) => `/${l}${rest}${qs ? `?${qs}` : ""}`;
  return (
    <div className="flex items-center rounded-full border border-[var(--line)] p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {(["id", "en"] as const).map((l) => (
        <Link
          key={l}
          href={href(l)}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 transition ${l === locale ? "bg-[var(--color-ink-900)] text-white" : "muted hover:text-[var(--fg)]"}`}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
