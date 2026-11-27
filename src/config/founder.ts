/**
 * Data pendiri untuk halaman Tentang Kami dan data terstruktur (JSON-LD).
 * Teks biografi (dwibahasa) ada di src/messages/{id,en}.json pada `aboutPage.founder`.
 * Foto: letakkan di public/assets/about/founder.webp (rasio 4:5, lihat docs/ASSETS.md), lalu `npm run assets:sync`.
 */
export const founder = {
  name: "Muhammad Fajri Ramadhan",
  initials: "MF",
  linkedin: "https://www.linkedin.com/in/muhammad-fajri-ramadhan-597256311/",
  photoKey: "about/founder",
} as const;
