import { Icon } from "./icons";
import { trackStep } from "@/lib/track";
import type { TrackStatus } from "@/lib/track";

const LABELS = ["Masuk", "Penawaran", "Bayar", "Proses", "Dikirim", "Selesai"];

/** Garis progres 6 tahap (sama dengan yang dilihat pelanggan di Lacak Pesanan). */
export function OrderStepper({ status }: { status: TrackStatus }) {
  const step = trackStep(status);
  if (step < 0) return null;
  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Progres pesanan">
      {LABELS.map((l, i) => (
        <li key={l} className="flex flex-col items-center gap-1.5 text-center" aria-current={i === step ? "step" : undefined}>
          <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${i < step ? "border-green-600 bg-green-600 text-white" : i === step ? "border-[var(--color-ink-900)] bg-[var(--color-ink-900)] text-white" : "border-[var(--line)] muted"}`}>
            {i < step ? <Icon name="check" size={14} /> : i + 1}
          </span>
          <span className={`text-[10px] leading-tight sm:text-xs ${i === step ? "font-bold" : "muted"}`}>{l}</span>
        </li>
      ))}
    </ol>
  );
}
