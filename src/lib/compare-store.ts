"use client";

import { useSyncExternalStore } from "react";
import { parseSlugs, toggleSlug, type ToggleResult } from "./compare";

/** Penyimpanan daftar banding di browser (localStorage) + sinkron antar tab dan komponen. Aman bila storage diblokir. */
const KEY = "tr-compare";
const listeners = new Set<() => void>();
let memory: string[] = [];
let snapshot: string[] = [];
let loaded = false;

function read(): string[] {
  try { return parseSlugs(localStorage.getItem(KEY)); } catch { return memory; }
}
function write(list: string[]) {
  memory = list; snapshot = list;
  try { localStorage.setItem(KEY, list.join(",")); } catch { /* storage diblokir: tetap di memori */ }
  listeners.forEach((l) => l());
}
function load() {
  if (loaded) return;
  loaded = true; snapshot = read(); memory = snapshot;
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== KEY) return;
      const next = read();
      if (next.join(",") !== snapshot.join(",")) { snapshot = next; listeners.forEach((l) => l()); }
    });
  }
}

const subscribe = (cb: () => void) => { load(); listeners.add(cb); return () => { listeners.delete(cb); }; };
const getSnapshot = () => { load(); return snapshot; };
const EMPTY: string[] = [];

export function useCompare() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {
    slugs,
    has: (s: string) => slugs.includes(s),
    toggle: (s: string): ToggleResult => { const r = toggleSlug(getSnapshot(), s); if (r.slugs !== getSnapshot()) write(r.slugs); return r; },
    remove: (s: string) => write(getSnapshot().filter((x) => x !== s)),
    clear: () => write([]),
    set: (list: string[]) => write(parseSlugs(list)),
  };
}
