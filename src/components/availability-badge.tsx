import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { effectiveAvailability, type PublicProduct } from "@/lib/products";

const tone = {
  CHECK: "chip-tone-warn",
  VERIFIED: "chip-tone-ok",
  PREORDER: "chip-tone-info",
  SOLD_OUT: "chip-tone-mute",
} as const;

/** Satu teks yang sama di mobile dan desktop: "Tersedia", "Check QC", "Pre-order", "Habis". */
export function AvailabilityBadge({ product, t }: { product: Pick<PublicProduct, "availability" | "verifiedAt">; t: Messages; locale?: Locale }) {
  const status = effectiveAvailability(product);
  return <span className={`chip ${tone[status]}`}>{t.availabilityShort[status]}</span>;
}
