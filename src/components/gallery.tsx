"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { enter } from "@/lib/anim";
import { Icon, type IconName } from "./icons";

interface Img { url: string; alt: string | null }

/** Galeri produk: foto utama + thumbnail. Hanya foto utama yang di-prioritaskan (LCP), sisanya lazy. */
export function Gallery({ images, name, placeholderIcon, imageLabel }: { images: Img[]; name: string; placeholderIcon: IconName; imageLabel: string }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => { if (i > 0) void enter(frame.current, "fade"); }, [i]);
  return (
    <div>
      <div ref={frame} className="card relative aspect-square overflow-hidden bg-[var(--color-ink-100)] sm:aspect-[4/3] dark:bg-[var(--color-ink-800)]">
        {cur ? (
          <Image key={cur.url} src={cur.url} alt={cur.alt ?? name} fill priority={i === 0} sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />
        ) : (
          <div className="bg-grid muted absolute inset-0 grid place-items-center" aria-hidden><Icon name={placeholderIcon} size={64} /></div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 8).map((img, n) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={imageLabel.replace("{n}", String(n + 1))}
                aria-pressed={n === i}
                className={`card relative block h-16 w-16 overflow-hidden sm:h-20 sm:w-20 ${n === i ? "!border-[var(--color-ink-900)] ring-2 ring-[var(--color-ink-900)]" : "opacity-80 hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
