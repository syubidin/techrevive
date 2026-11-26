"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";
import { ANY_DEVICE, BUDGETS, FINDER_STORAGE, PRIORITIES, PURPOSES, buildFinderParams, sanitizeAnswers, type Answers } from "@/lib/needs";
import { Icon, categoryIcon, type IconName } from "./icons";

type Step = "purpose" | "device" | "budget" | "priority";
const STEPS: Step[] = ["purpose", "device", "budget", "priority"];
const PURPOSE_ICON: Record<string, IconName> = { study: "file-text", office: "monitor", creative: "camera", gaming: "gamepad", business: "receipt", daily: "heart" };
const PRIORITY_ICON: Record<string, IconName> = { cheap: "tag", performance: "cpu", battery: "battery", mint: "badge-check" };

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* mode privat: abaikan */ } };

/**
 * Tombol + dialog "Bantu memutuskan". Empat pertanyaan (kebutuhan, perangkat, anggaran, prioritas) diubah menjadi
 * filter katalog. `auto` membukanya sekali untuk pengunjung baru di katalog tanpa filter; sesudah itu hanya lewat tombol.
 * Jawaban hanya disimpan di perangkat pengunjung (localStorage), tidak dikirim ke server.
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
  const [answers, setAnswers] = useState<Answers>({});
  const current = STEPS[step]!;

  const open = useCallback(() => {
    let saved: Answers = {};
    try { saved = sanitizeAnswers(JSON.parse(read(FINDER_STORAGE.answers) ?? "{}")); } catch { /* data rusak: mulai kosong */ }
    setAnswers(saved);
    setStep(0);
    write(FINDER_STORAGE.seen, "1");
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  // Muncul otomatis sekali untuk pengunjung baru, hanya di katalog polos (tanpa filter/pencarian) dan bukan untuk bot.
  useEffect(() => {
    if (!auto || navigator.webdriver || [...params.keys()].length > 0 || read(FINDER_STORAGE.seen)) return;
    const id = window.setTimeout(open, 900);
    return () => window.clearTimeout(id);
  }, [auto, params, open]);

  const pickOption = (value: string) => {
    const next = { ...answers, [current]: value } as Answers;
    setAnswers(next);
    if (step < STEPS.length - 1) window.setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 140);
  };
  const apply = () => {
    const clean = sanitizeAnswers(answers);
    write(FINDER_STORAGE.answers, JSON.stringify(clean));
    ref.current?.close();
    const qs = buildFinderParams(clean);
    router.push(`/${locale}/catalog${qs ? `?${qs}` : ""}`);
  };

  const options: Array<{ value: string; label: string; icon: IconName }> = (() => {
    switch (current) {
      case "purpose": return PURPOSES.map((v) => ({ value: v, label: f.purpose[v], icon: PURPOSE_ICON[v]! }));
      case "device": return [
        ...categories.map((c) => ({ value: c.slug, label: locale === "id" ? c.nameId : c.nameEn, icon: categoryIcon(c.slug) })),
        { value: ANY_DEVICE, label: f.device.any, icon: "search" as IconName },
      ];
      case "budget": return BUDGETS.map((v) => ({ value: v, label: f.budget[v], icon: "wallet" as IconName }));
      case "priority": return PRIORITIES.map((v) => ({ value: v, label: f.priority[v], icon: PRIORITY_ICON[v]! }));
    }
  })();
  const selected = answers[current];
  const last = step === STEPS.length - 1;

  return (
    <>
      <button type="button" onClick={open} className={`btn btn-${variant}`}><Icon name="sparkles" size={18} />{f.trigger}</button>
      <dialog ref={ref} className="dialog dialog-wide" aria-labelledby={titleId} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-base font-extrabold sm:text-lg">{f.title}</h2>
            <p className="muted mt-0.5 text-xs sm:text-sm">{f.sub}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label={f.close} onClick={() => ref.current?.close()}><Icon name="x" size={16} /></button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="muted text-xs font-semibold" aria-live="polite">{f.step.replace("{n}", String(step + 1)).replace("{m}", String(STEPS.length))}</p>
            <div className="flex gap-1.5" aria-hidden>{STEPS.map((_, i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= step ? "bg-[var(--color-brand-500)]" : "bg-[var(--line)]"}`} />)}</div>
          </div>
          <h3 className="mt-4 text-lg font-bold sm:text-xl">{f.q[current]}</h3>
          <div role="radiogroup" aria-label={f.q[current]} className="mt-4 grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
            {options.map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={selected === o.value} onClick={() => pickOption(o.value)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left font-semibold transition ${selected === o.value ? "border-[var(--color-brand-500)] bg-brand-500/10" : "border-[var(--line)] bg-[var(--card)] hover:border-[var(--color-ink-500)]"}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={o.icon} size={18} /></span>
                <span className="min-w-0 flex-1">{o.label}</span>
                {selected === o.value && <Icon name="check" size={16} className="shrink-0 text-[var(--color-brand-600)]" />}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {step > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep((s) => s - 1)}><Icon name="arrow-left" size={14} />{f.back}</button>}
              {step > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAnswers({}); setStep(0); }}>{f.restart}</button>}
            </div>
            <div className="flex gap-2">
              {!last && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep((s) => s + 1)}>{f.skip}</button>}
              {last ? <button type="button" className="btn btn-primary" onClick={apply}>{f.show}<Icon name="arrow-right" size={16} /></button>
                : step > 0 && Object.keys(answers).length > 0 && <button type="button" className="btn btn-primary btn-sm" onClick={apply}>{f.show}</button>}
            </div>
          </div>
          <p className="muted mt-4 text-xs">{f.hint}</p>
        </div>
      </dialog>
    </>
  );
}
