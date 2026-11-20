"use client";

import { useState, useTransition } from "react";
import { cancelClaimAction, submitClaimAction, type ClaimActionState, type TrackData } from "@/app/[locale]/track/actions";
import type { Locale } from "@/config/site";
import { formatDate, type Messages } from "@/lib/i18n";
import { ISSUE_MAX, ISSUE_MIN } from "@/lib/warranty";
import type { ClaimStatus } from "@/lib/claim-flow";
import { Icon } from "./icons";

const TONE: Record<ClaimStatus, string> = {
  SUBMITTED: "chip-tone-info", REVIEWING: "chip-tone-info", APPROVED: "chip-tone-ok", IN_SERVICE: "chip-tone-warn",
  READY: "chip-tone-ok", RESOLVED: "chip-tone-ok", REJECTED: "chip-tone-bad", CANCELLED: "chip-tone-mute",
};

/** Garansi dan klaim di halaman Lacak. Setiap aksi mengirim ulang kode + nomor WA agar diverifikasi di server. */
export function ClaimPanel({ locale, t, warranty, creds, onChanged }: {
  locale: Locale; t: Messages; warranty: NonNullable<TrackData["warranty"]>; creds: { code: string; phone: string }; onChanged: () => void;
}) {
  const tr = t.track.claim;
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState("");
  const [msg, setMsg] = useState<ClaimActionState>(null);

  const body = (extra?: Record<string, string>) => {
    const fd = new FormData();
    fd.set("code", creds.code); fd.set("phone", creds.phone);
    for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
    return fd;
  };
  const errText = (e: string) => (tr.errors as Record<string, string>)[e] ?? tr.errors.generic;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--line)] p-4 sm:p-5" aria-labelledby="warranty-h">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="shield-check" size={20} />
        <h3 id="warranty-h" className="font-bold">{tr.title}</h3>
        {warranty.state === "active" && <span className="chip chip-tone-ok">{tr.active}</span>}
        {warranty.state === "expired" && <span className="chip chip-tone-mute">{tr.expired}</span>}
      </div>
      <p className="muted text-sm">
        {warranty.state === "active" && warranty.endsAt && tr.activeInfo.replace("{date}", formatDate(warranty.endsAt, locale)).replace("{days}", String(warranty.daysLeft ?? 0))}
        {warranty.state === "expired" && warranty.endsAt && tr.expiredInfo.replace("{date}", formatDate(warranty.endsAt, locale))}
        {warranty.state === "none" && tr.noneInfo}
      </p>

      {warranty.claims.length > 0 && (
        <ul className="space-y-3" aria-label={tr.list}>
          {warranty.claims.map((c) => (
            <li key={c.code} className="rounded-lg border border-[var(--line)] p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold">{c.code}</span>
                <span className={`chip ${TONE[c.status]}`}>{tr.status[c.status]}</span>
              </div>
              <p className="mt-2 whitespace-pre-line break-words">{c.issue}</p>
              <p className="muted mt-1 text-xs">{formatDate(c.createdAt, locale)}</p>
              {c.resolution && (
                <p className="mt-2 rounded-md bg-[var(--color-ink-100)] p-2 text-sm dark:bg-[var(--color-ink-800)]"><span className="font-semibold">{tr.resolution}: </span>{c.resolution}</p>
              )}
              {c.cancellable && (
                <button
                  type="button" disabled={pending} className="btn btn-ghost btn-sm mt-2"
                  onClick={() => start(async () => {
                    const r = await cancelClaimAction(body({ claimCode: c.code }));
                    setMsg(r); if (r?.ok) onChanged();
                  })}
                >
                  <Icon name="x" size={16} />{tr.cancel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {warranty.blocker === null && !open && (
        <button type="button" className="btn btn-primary" onClick={() => { setOpen(true); setMsg(null); }}>
          <Icon name="wrench" size={18} />{tr.start}
        </button>
      )}
      {warranty.blocker && warranty.blocker !== "notStarted" && (
        <p className="muted flex gap-2 text-sm"><Icon name="info" size={16} className="mt-0.5 shrink-0" />{errText(warranty.blocker)}</p>
      )}

      {open && warranty.blocker === null && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await submitClaimAction(body({ issue }));
              setMsg(r);
              if (r?.ok) { setOpen(false); setIssue(""); onChanged(); }
            });
          }}
        >
          <div>
            <label htmlFor="claim-issue" className="label">{tr.issueLabel}</label>
            <textarea
              id="claim-issue" className="input min-h-28" required minLength={ISSUE_MIN} maxLength={ISSUE_MAX}
              value={issue} onChange={(e) => setIssue(e.target.value)} placeholder={tr.issueHint} aria-describedby="claim-issue-help"
            />
            <p id="claim-issue-help" className="muted mt-1 flex justify-between text-xs"><span>{tr.issueHelp}</span><span>{issue.length}/{ISSUE_MAX}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || issue.trim().length < ISSUE_MIN} className="btn btn-primary">
              <Icon name={pending ? "refresh" : "send"} size={18} className={pending ? "animate-spin" : ""} />{pending ? t.track.checking : tr.submit}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{tr.close}</button>
          </div>
        </form>
      )}

      {msg && !msg.ok && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{errText(msg.error)}</p>}
      {msg?.ok && msg.code && <p role="status" className="flex gap-2 rounded-lg border border-green-600/40 bg-green-600/10 p-3 text-sm"><Icon name="circle-check" size={18} className="mt-0.5 shrink-0 text-green-600" />{tr.sent.replace("{code}", msg.code)}</p>}
    </section>
  );
}
