"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { Visual } from "./visual";
import { getAsset } from "@/lib/assets";

/**
 * Layar 404 / error. not-found dan error tidak menerima `params`, jadi bahasa dibaca dari URL (/en/... atau /id/...).
 * Teksnya sengaja di sini (bukan di messages) agar tetap tampil walau pemuatan pesan yang gagal. Gambar: states/not-found, states/error.
 */
const COPY = {
  id: {
    notFound: { title: "Halaman tidak ditemukan", desc: "Alamat yang Anda buka tidak tersedia atau sudah dipindahkan." },
    error: { title: "Terjadi kendala", desc: "Halaman gagal dimuat. Coba muat ulang, atau hubungi kami lewat WhatsApp bila berlanjut." },
    retry: "Coba lagi", browse: "Lihat katalog", home: "Ke beranda",
  },
  en: {
    notFound: { title: "Page not found", desc: "The address you opened is not available or has moved." },
    error: { title: "Something went wrong", desc: "The page failed to load. Try again, or contact us on WhatsApp if it keeps happening." },
    retry: "Try again", browse: "Browse catalog", home: "Back home",
  },
} as const;

export function StateScreen({ kind, reset }: { kind: "notFound" | "error"; reset?: () => void }) {
  const locale = usePathname()?.startsWith("/en") ? "en" : "id";
  const c = COPY[locale];
  const key = kind === "notFound" ? "states/not-found" : "states/error";
  return (
    <div className="container-x grid max-w-xl place-items-center gap-3 py-16 text-center sm:py-24">
      {getAsset(key) ? (
        <Visual k={key} priority sizes="320px" className="w-64 rounded-3xl" />
      ) : (
        <span className="icon-tile !h-16 !w-16 !rounded-2xl"><Icon name={kind === "notFound" ? "search" : "alert"} size={30} /></span>
      )}
      {kind === "notFound" && <p className="text-6xl font-extrabold tracking-tight text-[var(--color-brand-600)] dark:text-[var(--color-brand-300)]" aria-hidden="true">404</p>}
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{c[kind].title}</h1>
      <p className="muted max-w-sm text-sm sm:text-base">{c[kind].desc}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {reset && <button type="button" onClick={reset} className="btn btn-primary"><Icon name="refresh" size={18} />{c.retry}</button>}
        <Link href={`/${locale}/catalog`} className={`btn ${reset ? "btn-ghost" : "btn-primary"}`}>{c.browse}</Link>
        <Link href={`/${locale}`} className="btn btn-ghost"><Icon name="home" size={18} />{c.home}</Link>
      </div>
    </div>
  );
}
