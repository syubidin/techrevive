/** Normalisasi nomor HP Indonesia ke format 628xxxxxxxxx. Return null jika tidak valid. */
export function normalizeIdPhone(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  let d = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (d.startsWith("620")) d = "62" + d.slice(3); // salah ketik +62 0812...
  else if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;

  if (!d.startsWith("628")) return null; // hanya seluler
  return d.length >= 10 && d.length <= 13 ? d : null;
}

/** Untuk log: 6281****890 */
export function maskPhone(phone: string): string {
  return phone.length <= 6 ? "***" : `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
