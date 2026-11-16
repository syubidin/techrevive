"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { enter } from "@/lib/anim";
import { trackAction, type TrackState } from "@/app/[locale]/track/actions";
import type { Locale } from "@/config/site";
import { formatDate, formatIdr, type Messages } from "@/lib/i18n";
import { trackStep, TRACK_STEP_COUNT, type TrackStatus } from "@/lib/track";
import { Icon } from "./icons";

export function TrackForm({ locale, t, waHref }: { locale: Locale; t: Messages; waHref: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackAction, null);
  const tr = t.track;
  const d = state?.ok ? state.data : null;
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => { if (d) void enter(result.current, "bottom"); }, [d]);
  const step = d ? trackStep(d.status) : -1;
  const info = d ? tr.status[d.status as TrackStatus] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <form action={action} className="card space-y-4 p-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <label htmlFor="code" className="label">{tr.code}</label>
          <input id="code" name="code" className="input uppercase" placeholder={tr.codeHint} required maxLength={20} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="phone" className="label">{tr.phone}</label>
          <input id="phone" name="phone" type="tel" inputMode="tel" className="input" placeholder="08xxxxxxxxxx" required maxLength={20} autoComplete="tel" />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          <Icon name={pending ? "refresh" : "search"} size={18} className={pending ? "animate-spin" : ""} />
          {pending ? tr.checking : tr.submit}
        </button>
        {state && !state.ok && (
          <p role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0" />{tr[state.error]}
          </p>
        )}
      </form>

      <div aria-live="polite">
        {d && info ? (
          <div ref={result} className="card space-y-6 p-5 sm:p-6">
            <div>
              <p className="muted text-xs font-semibold uppercase tracking-wide">{tr.product}</p>
              <p className="mt-1 text-lg font-bold">{d.productName}</p>
              <p className="muted mt-1 text-sm">{tr.created}: {formatDate(d.createdAt, locale)}</p>
            </div>

            {step >= 0 ? (
              <ol className="grid grid-cols-6 gap-1" aria-label="Progress">
                {tr.steps.slice(0, TRACK_STEP_COUNT).map((label, i) => (
                  <li key={label} className="flex flex-col items-center gap-1.5 text-center" aria-current={i === step ? "step" : undefined}>
                    <span className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${i < step ? "border-green-600 bg-green-600 text-white" : i === step ? "border-[var(--color-ink-900)] bg-[var(--color-ink-900)] text-white" : "border-[var(--line)] muted"}`}>
                      {i < step ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    <span className={`text-[10px] leading-tight sm:text-xs ${i === step ? "font-bold" : "muted"}`}>{label}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className={`flex gap-3 rounded-xl border p-4 ${step < 0 ? "border-red-500/40 bg-red-500/10" : "border-[var(--line)] bg-[var(--color-ink-100)] dark:bg-[var(--color-ink-800)]"}`}>
              <Icon name={step < 0 ? "alert" : d.status === "DELIVERED" ? "circle-check" : "info"} className="mt-0.5 shrink-0" />
              <div><p className="font-bold">{info.t}</p><p className="muted mt-1 text-sm">{info.d}</p></div>
            </div>

            {d.history.length > 1 && (
              <ol className="space-y-2 border-l-2 border-[var(--line)] pl-4 text-sm" aria-label={tr.timeline}>
                {[...d.history].reverse().map((h, i) => (
                  <li key={`${h.status}-${h.at}`} className="relative">
                    <span className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-[var(--color-ink-900)]" : "bg-[var(--color-ink-300)]"}`} aria-hidden />
                    <p className={i === 0 ? "font-bold" : ""}>{tr.status[h.status].t}</p>
                    <p className="muted text-xs">{new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(h.at))}</p>
                  </li>
                ))}
              </ol>
            )}

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {d.quotedPrice != null && (
                <div><dt className="muted">{tr.quotedPrice}</dt><dd className="font-bold">{formatIdr(d.quotedPrice)}</dd></div>
              )}
              {d.quoteExpiresAt && d.status === "QUOTED" && (
                <div><dt className="muted">{tr.validUntil}</dt><dd className="font-bold">{new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(d.quoteExpiresAt))} WIB</dd></div>
              )}
              {d.delivery && (
                <div className="sm:col-span-2">
                  <dt className="muted">{tr.delivery}</dt>
                  <dd className="font-bold">
                    {d.delivery.method === "OWN_TEAM"
                      ? `${tr.ownTeam}${d.delivery.deliveredBy ? ` (${tr.by}: ${d.delivery.deliveredBy})` : ""}`
                      : `${tr.courier}: ${d.delivery.courier ?? "-"}${d.delivery.trackingNumber ? ` · ${tr.tracking} ${d.delivery.trackingNumber}` : ""}`}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-2">
              {d.invoiceToken && <Link href={`/${locale}/invoice/${d.invoiceToken}`} className="btn btn-ghost"><Icon name="receipt" size={18} />{tr.invoice}</Link>}
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn-accent"><Icon name="message-circle" size={18} />{tr.helpWa}</a>
            </div>
          </div>
        ) : (
          <div className="card grid place-items-center gap-3 p-10 text-center">
            <span className="muted"><Icon name="package" size={40} /></span>
            <p className="muted max-w-sm text-sm">{tr.intro}</p>
          </div>
        )}
      </div>
    </div>
  );
}
