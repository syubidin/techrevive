import type { Locale } from "@/config/site";
import { formatDate, type Messages } from "@/lib/i18n";
import { effectiveAvailability, type PublicProduct } from "@/lib/products";

const tone = {
  CHECK: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  VERIFIED: "border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-300",
  PREORDER: "border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300",
  SOLD_OUT: "border-[var(--line)] bg-[var(--color-ink-100)] text-[var(--color-ink-500)] dark:bg-[var(--color-ink-800)]",
} as const;

export function AvailabilityBadge({ product, t, locale }: { product: Pick<PublicProduct, "availability" | "verifiedAt">; t: Messages; locale: Locale }) {
  const status = effectiveAvailability(product);
  const label = t.availability[status].replace("{date}", product.verifiedAt ? formatDate(product.verifiedAt, locale) : "");
  return <span className={`chip ${tone[status]}`}>{label}</span>;
}
