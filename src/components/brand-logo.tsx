/**
 * Logo yang menyesuaikan tema otomatis (satu berkas saja yang diunduh):
 * mode terang = latar putih + logo biru, mode gelap = latar biru + logo putih.
 * Biru logo = #07273E (warna asli logo TechRevive).
 */
export function BrandLogo({ variant, size, className = "", priority = false, alt = "" }: { variant: "mark" | "full"; size: number; className?: string; priority?: boolean; alt?: string }) {
  const base = variant === "mark" ? "/brand/mark" : "/brand/logo";
  return (
    <picture>
      {/* "screen and": saat dicetak tetap logo biru agar terlihat di kertas putih */}
      <source media="screen and (prefers-color-scheme: dark)" srcSet={`${base}-white.png`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${base}-blue.png`} alt={alt} width={size} height={size} className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" draggable={false} />
    </picture>
  );
}
