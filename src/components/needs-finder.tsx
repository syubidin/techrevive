"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { ANY_DEVICE, BUDGETS, FINDER_SEEN_KEY, PRIORITIES, PURPOSES, buildFinderParams, sanitizeAnswers, type Answers } from "@/lib/needs";
import { Icon, categoryIcon, type IconName } from "./icons";

const TOTAL = 3; // 1 kebutuhan, 2 perangkat, 3 anggaran + prioritas (opsional) + tombol hasil
const PURPOSE_ICON: Record<string, IconName> = { study: "file-text", office: "monitor", creative: "camera", gaming: "gamepad", business: "receipt", daily: "heart" };

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* mode privat: abaikan */ } };

type Option = { value: string; label: string; icon?: IconName };

/**
 * Tombol + panel "Bantu memutuskan": 3 langkah singkat yang diubah menjadi filter katalog.
 * HP = lembar dari bawah, desktop = kartu di tengah. Setiap dibuka selalu mulai kosong (tanpa pilihan terisi).
 * Langkah 1 dan 2 maju otomatis begitu memilih; tombol hasil hanya ada di langkah terakhir.
 * `auto` membukanya sekali untuk pengunjung baru di katalog tanpa filter. Tidak ada jawaban yang disimpan.
 */
export function NeedsFinder({ locale, t, categories, auto = false, variant = "ghost" }: {
  locale: Locale; t: Messages; categories: ReadonlyArray<{ slug: string; nameId: string; nameEn: string }>; auto?: boolean; variant?: "primary" | "ghost";
}) {
  const f = t.finder;
  const router = useRouter();
  const params = useSearchParams();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});

  const open = useCallback(() => {
    setA({});
    setStep(0);
    write(FINDER_SEEN_KEY, "1");
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  // Muncul otomatis sekali untuk pengunjung baru, hanya di katalog polos (tanpa filter/pencarian) dan bukan untuk bot.
  useEffect(() => {
    if (!auto || navigator.webdriver || [...params.keys()].length > 0 || read(FINDER_SEEN_KEY)) return;
    const id = window.setTimeout(open, 900);
    return () => window.clearTimeout(id);
  }, [auto, params, open]);

  const choose = <K extends keyof Answers>(key: K, value: Answers[K], advance: boolean) => {
    setA((cur) => ({ ...cur, [key]: cur[key] === value && !advance ? undefined : value }));
    if (advance) window.setTimeout(() => setStep((s) => Math.min(s + 1, TOTAL - 1)), 160);
  };

  const apply = () => {
    ref.current?.close();
    const qs = buildFinderParams(sanitizeAnswers(a));
    router.push(`/${locale}/catalog${qs ? `?${qs}` : ""}`);
  };

  const purposes: Option[] = PURPOSES.map((v) => ({ value: v, label: f.purpose[v], icon: PURPOSE_ICON[v] }));
  const devices: Option[] = [
    ...categories.map((c) => ({ value: c.slug, label: locale === "id" ? c.nameId : c.nameEn, icon: categoryIcon(c.slug) })),
    { value: ANY_DEVICE, label: f.device.any, icon: "search" as IconName },
  ];
  const summary = [
    a.purpose && f.purpose[a.purpose],
    a.device && (a.device === ANY_DEVICE ? f.device.any : devices.find((d) => d.value === a.device)?.label),
  ].filter(Boolean) as string[];

  const last = step === TOTAL - 1;
  const heading = step === 0 ? f.q.purpose : step === 1 ? f.q.device : f.q.budget;

  return (
    <>
      <button type="button" onClick={open} className={`btn btn-${variant}`}><Icon name="sparkles" size={18} />{f.trigger}</button>
      <dialog ref={ref} className="dialog finder" aria-labelledby={titleId} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <header className="flex items-center gap-2 px-3 pt-3 sm:px-4">
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0 disabled:invisible" aria-label={f.back} disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><Icon name="arrow-left" size={18} /></button>
          <div className="flex flex-1 items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step + 1} aria-label={f.step.replace("{n}", String(step + 1)).replace("{m}", String(TOTAL))}>
            {Array.from({ length: TOTAL }, (_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-500)]" : "bg-[var(--line)]"}`} />)}
          </div>
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" aria-label={f.close} onClick={() => ref.current?.close()}><Icon name="x" size={18} /></button>
        </header>

        <div key={step} className="finder-step max-h-[75dvh] overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="eyebrow">{f.step.replace("{n}", String(step + 1)).replace("{m}", String(TOTAL))}</p>
          <h2 id={titleId} className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{heading}</h2>

          {step < 2 && (
            <div role="radiogroup" aria-labelledby={titleId} className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
              {(step === 0 ? purposes : devices).map((o) => {
                const on = (step === 0 ? a.purpose : a.device) === o.value;
                return (
                  <button key={o.value} type="button" role="radio" aria-checked={on}
                    onClick={() => (step === 0 ? choose("purpose", o.value as Answers["purpose"], true) : choose("device", o.value, true))}
                    className={`relative flex min-h-[5.5rem] flex-col items-start gap-3 rounded-2xl border p-3.5 text-left font-semibold transition active:scale-[.98] ${on ? "border-[var(--color-brand-600)] bg-brand-500/10 ring-2 ring-[var(--color-brand-500)]/40" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--color-brand-500)]"}`}>
                    <span className="icon-tile !h-9 !w-9 !rounded-xl"><Icon name={o.icon ?? "check"} size={18} /></span>
                    <span className="text-sm leading-snug sm:text-base">{o.label}</span>
                    {on && <Icon name="check" size={16} className="absolute right-3 top-3 text-[var(--color-brand-600)]" />}
                  </button>
                );
              })}
            </div>
          )}

          {last && (
            <>
              <div role="radiogroup" aria-labelledby={titleId} className="mt-4 flex flex-wrap gap-2">
                {BUDGETS.map((v) => {
                  const on = a.budget === v;
                  return (
                    <button key={v} type="button" role="radio" aria-checked={on} onClick={() => choose("budget", v, false)}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-[.97] ${on ? "border-[var(--color-brand-600)] bg-brand-500/10 ring-2 ring-[var(--color-brand-500)]/40" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--color-brand-500)]"}`}>
                      {on && <Icon name="check" size={14} />}{f.budget[v]}
                    </button>
                  );
                })}
              </div>

              <h3 className="mt-6 text-sm font-bold">{f.q.priority}</h3>
              <div role="radiogroup" aria-label={f.q.priority} className="mt-2.5 flex flex-wrap gap-2">
                {PRIORITIES.map((v) => {
                  const on = a.priority === v;
                  return (
                    <button key={v} type="button" role="radio" aria-checked={on} onClick={() => choose("priority", v, false)}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition active:scale-[.97] ${on ? "border-[var(--color-brand-600)] bg-brand-500/10 ring-2 ring-[var(--color-brand-500)]/40" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--color-brand-500)]"}`}>
                      {on && <Icon name="check" size={14} />}{f.priority[v]}
                    </button>
                  );
                })}
              </div>

              {summary.length > 0 && <p className="muted mt-5 text-sm" aria-live="polite">{summary.join(" · ")}</p>}
              <button type="button" className="btn btn-primary btn-lg mt-4 w-full" onClick={apply}>{f.show}<Icon name="arrow-right" size={18} /></button>
            </>
          )}

          {!last && (
            <div className="mt-5 flex justify-center">
              <button type="button" className="btn btn-ghost btn-sm !border-transparent" onClick={() => setStep((s) => s + 1)}>{f.skip}</button>
            </div>
          )}
          <p className="muted mt-4 text-center text-xs">{f.hint}</p>
        </div>
      </dialog>
    </>
  );
}
