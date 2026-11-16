"use client";

import { useEffect, useRef, useState } from "react";
import { enter } from "@/lib/anim";
import { Icon } from "./icons";

/**
 * Satu instance filter: lembar bawah di layar kecil, panel statis di layar besar.
 * Isi (form GET) dirender server dan hanya dibungkus di sini, jadi tidak ada duplikasi DOM.
 */
export function FilterSheet({ title, count, closeLabel, children }: { title: string; count: number; closeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open && !window.matchMedia("(min-width: 1024px)").matches) void enter(panel.current, "bottom"); }, [open]);

  useEffect(() => {
    if (!open) return;
    // Panel hanya berupa lembar bawah di bawah 1024px. Di layar lebar ia statis, jadi scroll tidak boleh dikunci.
    const mq = window.matchMedia("(min-width: 1024px)");
    const prev = document.body.style.overflow;
    const sync = () => {
      if (mq.matches) {
        document.body.style.overflow = prev;
        setOpen(false);
      } else {
        document.body.style.overflow = "hidden";
      }
    };
    sync();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", sync);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", sync);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className="btn btn-ghost w-full lg:hidden">
        <Icon name="sliders" size={18} />
        {title}
        {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-ink-900)] px-1.5 text-xs text-white">{count}</span>}
      </button>
      {open && <button type="button" tabIndex={-1} aria-label={closeLabel} onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/50 lg:hidden" />}
      <div
        ref={panel}
        className={
          open
            ? "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-[var(--bg)] p-3 shadow-2xl lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
            : "hidden lg:block"
        }
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={title}
      >
        {open && (
          <div className="mb-2 flex justify-end lg:hidden">
            <button type="button" onClick={() => setOpen(false)} aria-label={closeLabel} className="btn btn-ghost !h-11 !w-11 !p-0"><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}
