/**
 * Semua nilai yang kemungkinan berubah ada di sini atau di .env.
 * GANTI nomor WhatsApp lewat env WHATSAPP_NUMBER (placeholder: 6281200000000).
 */
export const site = {
  name: "TechRevive",
  tagline: { id: "Second-hand premium & customizable", en: "Second-hand premium & customizable" },
  locales: ["id", "en"] as const,
  defaultLocale: "id" as const,
  /** Jam balas ditampilkan di UI; sesuaikan dengan kenyataan. */
  businessHours: { id: "Senin–Sabtu, 09.00–20.00 WIB", en: "Mon–Sat, 09:00–20:00 WIB" },
  replySlaMinutes: 15,
  quoteValidHours: 24,
  /** Margin minimum (basis poin) sebelum admin diberi peringatan. 500 = 5%. */
  minMarginBps: 500,
  placeholderWhatsApp: "6281200000000",
  /**
   * Link sosial media di footer dan halaman Kontak. Hapus baris platform yang tidak dipakai,
   * atau kosongkan `url` agar link tidak ditampilkan.
   */
  social: [
    { key: "instagram", label: "Instagram", url: "https://www.instagram.com/techrevive.id" },
    { key: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@techrevive_id" },
    { key: "youtube", label: "YouTube", url: "https://www.youtube.com/@Techreviveid" },
  ],
} as const;

export type Locale = (typeof site.locales)[number];
export const isLocale = (v: string): v is Locale => (site.locales as readonly string[]).includes(v);
