import type { Locale } from "@/config/site";
import { formatDate, type Messages } from "@/lib/i18n";
import { effectiveAvailability, type PublicProduct } from "@/lib/products";

const tone = {
  CHECK: "chip-tone-warn",
  VERIFIED: "chip-tone-ok",
  PREORDER: "chip-tone-info",
  SOLD_OUT: "chip-tone-mute",
} as const;

export function AvailabilityBadge({ product, t, locale, compact }: { product: Pick<PublicProduct, "availability" | "verifiedAt">; t: Messages; locale: Locale; compact?: boolean }) {
  const status = effectiveAvailability(product);
  const label = compact ? t.availabilityShort[status] : t.availability[status].replace("{date}", product.verifiedAt ? formatDate(product.verifiedAt, locale) : "");
  return <span className={`chip ${tone[status]}`}>{label}</span>;
}
