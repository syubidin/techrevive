"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { enter } from "@/lib/anim";
import { BrandLogo } from "./brand-logo";
import { Icon, type IconName } from "./icons";

export interface AdminNavItem { href: string; label: string; icon: IconName }

/**
 * Kerangka navigasi admin. Desktop: sidebar tetap. Ponsel: bilah atas + laci geser.
 * Bagian bawah (profil & keluar) dirender server lalu dioper sebagai `children`.
 */
export function AdminNav({ items, children }: { items: AdminNavItem[]; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) void enter(panel.current, "right"); }, [open]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

  const list = (
    <nav className="grid gap-1 text-sm font-medium" aria-label="Admin">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? "page" : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-xl px-3 transition ${active(n.href) ? "bg-[var(--color-ink-900)] text-white" : "muted hover:bg-[var(--color-ink-100)] hover:text-[var(--fg)] dark:hover:bg-[var(--color-ink-800)]"}`}
        >
          <Icon name={n.icon} size={18} />{n.label}
        </Link>
      ))}
    </nav>
  );
  const brand = (
    <div className="flex items-center gap-2.5">
      <BrandLogo variant="mark" size={32} className="h-8 w-8 object-contain" />
      <span className="font-extrabold">TechRevive</span>
      <span className="chip chip-tone-mute !min-h-0 !px-2 !py-0.5 !text-[10px]">Admin</span>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="no-print hidden border-r border-[var(--line)] bg-[var(--card)] p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        {brand}
        <div className="scrollbar-none mt-6 flex-1 overflow-y-auto">{list}</div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">{children}</div>
      </aside>

      {/* Ponsel */}
      <div className="no-print sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4 backdrop-blur-xl lg:hidden">
        {brand}
        <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open} className="btn btn-ghost !h-11 !w-11 !p-0"><Icon name="menu" /></button>
      </div>
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu admin">
          <button type="button" tabIndex={-1} aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div ref={panel} className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col bg-[var(--bg)] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="btn btn-ghost !h-11 !w-11 !p-0"><Icon name="x" /></button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto">{list}</div>
            <div className="mt-4 border-t border-[var(--line)] pt-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
