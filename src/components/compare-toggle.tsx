"use client";

import { useState } from "react";
import { useCompare } from "@/lib/compare-store";
import type { Messages } from "@/lib/i18n";
import { Icon } from "./icons";

/** Tombol "Bandingkan". `variant="icon"` dipakai di kartu produk (ikon saja, target sentuh 44px), `"full"` di halaman produk. */
export function CompareToggle({ slug, t, variant = "icon" }: { slug: string; t: Messages; variant?: "icon" | "full" }) {
  const { has, toggle } = useCompare();
  const [full, setFull] = useState(false);
  const on = has(slug);
  const label = on ? t.compare.remove : t.compare.add;
  const click = () => { const r = toggle(slug); setFull(r.full); if (r.full) setTimeout(() => setFull(false), 3500); };

  if (variant === "full") {
    return (
      <div>
        <button type="button" onClick={click} aria-pressed={on} className={`btn ${on ? "btn-primary" : "btn-ghost"}`}>
          <Icon name={on ? "check" : "compare"} size={18} />{label}
        </button>
        {full && <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-300">{t.compare.full}</p>}
      </div>
    );
  }
  return (
    <>
      <button
        type="button" onClick={click} aria-pressed={on} aria-label={label} title={label}
        className={`absolute right-1.5 top-1.5 z-10 grid h-11 w-11 place-items-center rounded-full border shadow-sm backdrop-blur transition sm:right-2 sm:top-2 ${on ? "border-[var(--color-ink-900)] bg-[var(--color-ink-900)] text-white" : "border-[var(--line)] bg-[var(--card)]"}`}
      >
        <Icon name={on ? "check" : "compare"} size={18} />
      </button>
      {full && <span role="status" className="absolute inset-x-2 top-14 z-10 rounded-lg bg-amber-100 p-2 text-xs text-amber-900 shadow">{t.compare.full}</span>}
    </>
  );
}
