"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { enter } from "@/lib/anim";
import { Icon, type IconName } from "./icons";

export interface MenuLink { href: string; label: string; icon: IconName }

/** Menu hamburger untuk layar kecil: panel geser dengan kunci scroll, tutup via ESC / ketuk latar. */
export function MobileMenu({ links, waHref, labels }: { links: MenuLink[]; waHref: string; labels: { open: string; close: string; wa: string } }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) void enter(panel.current, "top"); }, [open]);

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

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label={labels.open} aria-expanded={open} className="btn btn-ghost !h-11 !w-11 !p-0">
        <Icon name="menu" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={labels.open}>
          <button type="button" aria-label={labels.close} className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} tabIndex={-1} />
          <div ref={panel} className="absolute inset-x-0 top-0 rounded-b-2xl border-b border-[var(--line)] bg-[var(--bg)] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2">
              <span className="font-extrabold">TechRevive</span>
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="btn btn-ghost !h-11 !w-11 !p-0"><Icon name="x" /></button>
            </div>
            <nav className="grid gap-1" aria-label="Menu">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-[var(--color-ink-100)] dark:hover:bg-[var(--color-ink-800)]">
                  <Icon name={l.icon} className="muted" />
                  {l.label}
                  <Icon name="chevron-right" size={16} className="muted ml-auto" />
                </Link>
              ))}
            </nav>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-lg mt-3 w-full">
              <Icon name="message-circle" />{labels.wa}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
