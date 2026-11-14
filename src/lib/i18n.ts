import id from "@/messages/id.json";
import en from "@/messages/en.json";
import type { Locale } from "@/config/site";

const dictionaries = { id, en } as const;

export type Messages = typeof id;

export const getMessages = (locale: Locale): Messages => dictionaries[locale];

/** Pilih teks berbahasa sesuai locale; jatuh ke bahasa lain jika kosong. */
export function pick(locale: Locale, idText: string | null | undefined, enText: string | null | undefined): string {
  const primary = locale === "id" ? idText : enText;
  return primary || (locale === "id" ? enText : idText) || "";
}

export const formatIdr = (n: number): string => `Rp${n.toLocaleString("id-ID")}`;

export function formatDate(d: Date | string, locale: Locale = "id"): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(d));
}
