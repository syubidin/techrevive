"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/config/site";
import { formatIdr, type Messages } from "@/lib/i18n";
import { normalizeQuery } from "@/lib/search-text";
import { Icon } from "./icons";

interface Item { slug: string; nameId: string; nameEn: string; brand: string; price: number; image: string | null; condition: "REFURBISHED" | "USED"; grade: "A" | "B" | "C" | null }

/**
 * Kolom pencarian dengan saran otomatis (ARIA combobox). Berada di dalam <form> milik halaman,
 * jadi tanpa JavaScript tetap berfungsi sebagai pencarian biasa. Permintaan ditunda 250 ms dan
 * permintaan lama dibatalkan agar tidak membebani server.
 */
export function SearchBox({ id, locale, t, defaultValue = "", placeholder, label }: {
  id: string; locale: Locale; t: Messages; defaultValue?: string; placeholder: string; label?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, Item[]>());

  useEffect(() => {
    const q = normalizeQuery(value);
    if (q.length < 2) { setItems([]); setLoading(false); return; }
    const hit = cache.current.get(q);
    if (hit) { setItems(hit); setLoading(false); return; }
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as { items?: Item[] };
        const list = Array.isArray(data.items) ? data.items : [];
        if (cache.current.size > 50) cache.current.clear();
        cache.current.set(q, list);
        setItems(list); setActive(-1);
      } catch { if (!ctl.signal.aborted) setItems([]); }
      finally { if (!ctl.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [value]);

  useEffect(() => {
    const close = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const show = open && normalizeQuery(value).length >= 2;
  const nameOf = (i: Item) => (locale === "id" ? i.nameId : i.nameEn);
  const go = (i: Item) => { setOpen(false); router.push(`/${locale}/product/${i.slug}`); };

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <Icon name="search" size={18} className="muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
      {label && <label htmlFor={id} className="sr-only">{label}</label>}
      <input
        id={id} name="q" type="search" role="combobox" aria-expanded={show} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className="input !pl-10" placeholder={placeholder} autoComplete="off" maxLength={60}
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); return; }
          if (!show || items.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); go(items[active]); }
        }}
      />
      {show && (
        <div className="card absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-auto p-1.5 shadow-lg" role="presentation">
          <ul id={listId} role="listbox" aria-label={t.search.suggestions}>
            {items.map((i, idx) => (
              <li key={i.slug} id={`${listId}-${idx}`} role="option" aria-selected={idx === active}>
                <button
                  type="button" tabIndex={-1} onClick={() => go(i)} onMouseEnter={() => setActive(idx)}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${idx === active ? "bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-800)]" : ""}`}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white dark:bg-[var(--color-ink-800)]">
                    {i.image ? <Image src={i.image} alt="" fill sizes="44px" className="object-contain" /> : <span className="muted grid h-full place-items-center"><Icon name="package" size={18} /></span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="muted block truncate text-[11px] font-semibold uppercase tracking-wide">{i.brand}</span>
                    <span className="line-clamp-1 text-sm font-semibold">{nameOf(i)}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-bold">{formatIdr(i.price)}</span>
                </button>
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="muted p-3 text-sm" role="status">{loading ? t.search.loading : t.search.noSuggestions}</p>}
          <button type="submit" className="mt-1 flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm font-semibold hover:bg-[var(--color-ink-100)] dark:hover:bg-[var(--color-ink-800)]">
            <Icon name="search" size={16} />{t.search.viewAll.replace("{q}", value.trim())}
          </button>
        </div>
      )}
    </div>
  );
}
