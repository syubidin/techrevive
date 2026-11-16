"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

type Conn = { saveData?: boolean };

/** Memuat three.js hanya bila layak: layar lebar, gerakan tidak dikurangi, bukan mode hemat data, dan setelah browser idle. */
export function HeroSceneLoader() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const ok =
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !(navigator as Navigator & { connection?: Conn }).connection?.saveData;
    if (!ok) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setOn(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setOn(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  return on ? <HeroScene /> : null;
}
