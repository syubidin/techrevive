"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Satu-satunya tempat animasi halaman (GSAP). Server component cukup memberi atribut:
 *   data-intro   : naik halus saat halaman dibuka (hanya translate, teks tetap terlihat agar LCP tidak tertunda)
 *   data-reveal  : muncul saat discroll ke layar
 *   data-stagger : anak-anaknya muncul berurutan saat discroll
 *   data-float   : melayang pelan
 * GSAP dimuat setelah hidrasi dan dilewati bila pengguna memilih "kurangi gerakan".
 */
export function MotionRoot() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const intro = gsap.utils.toArray<HTMLElement>("[data-intro]");
        if (intro.length) gsap.from(intro, { y: 16, duration: 0.7, ease: "power3.out", stagger: 0.08, clearProps: "transform" });

        for (const el of gsap.utils.toArray<HTMLElement>("[data-reveal]")) {
          gsap.from(el, { opacity: 0, y: 28, duration: 0.7, ease: "power2.out", clearProps: "opacity,transform", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
        }
        for (const parent of gsap.utils.toArray<HTMLElement>("[data-stagger]")) {
          gsap.from(Array.from(parent.children), { opacity: 0, y: 20, duration: 0.5, ease: "power2.out", stagger: 0.06, clearProps: "opacity,transform", scrollTrigger: { trigger: parent, start: "top 88%", once: true } });
        }
        for (const el of gsap.utils.toArray<HTMLElement>("[data-float]")) {
          gsap.to(el, { y: -8, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });
        }
      });
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [pathname]);

  return null;
}
