"use client";

import Script from "next/script";
import { useState, type FormEvent } from "react";
import { JABODETABEK_CITIES } from "@/lib/shipping";
import type { Locale } from "@/config/site";
import type { Messages } from "@/lib/i18n";

type State = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "done"; waUrl: string; code: string };

const cityLabel = (c: string) => c.replace(/\b\w/g, (m) => m.toUpperCase());

export function InquiryForm({ productId, locale, t, turnstileSiteKey }: { productId: string; locale: Locale; t: Messages; turnstileSiteKey?: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "loading") return; // cegah klik ganda
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState({ kind: "loading" });

    const params = new URLSearchParams(window.location.search);
    const utm = { source: params.get("utm_source") ?? undefined, medium: params.get("utm_medium") ?? undefined, campaign: params.get("utm_campaign") ?? undefined };

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name: fd.get("name"),
          phone: fd.get("phone"),
          area: fd.get("area") || undefined,
          variantNote: fd.get("note") || undefined,
          website: fd.get("website") || undefined,
          turnstileToken: fd.get("cf-turnstile-response") || undefined,
          locale,
          utm,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; waUrl?: string; code?: string };
      if (!res.ok || !data.waUrl || !data.code) {
        const key = (data.error ?? "GENERIC") as keyof Messages["errors"];
        setState({ kind: "error", message: t.errors[key] ?? t.errors.GENERIC });
        (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
        return;
      }
      setState({ kind: "done", waUrl: data.waUrl, code: data.code });
      // noopener agar tab WhatsApp tidak mengakses window ini
      window.open(data.waUrl, "_blank", "noopener,noreferrer");
    } catch {
      setState({ kind: "error", message: t.errors.GENERIC });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="card space-y-3 p-5" role="status">
        <p className="font-semibold">{t.product.success}</p>
        <p className="muted text-sm">Kode / Code: <span className="font-mono font-bold">{state.code}</span></p>
        <a href={state.waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">{t.product.openWa}</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate>
      {turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
      <h2 className="text-lg font-bold">{t.product.modalTitle}</h2>
      <div>
        <label className="label" htmlFor="name">{t.form.name}</label>
        <input id="name" name="name" className="input" required minLength={2} maxLength={80} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="phone">{t.form.phone}</label>
        <input id="phone" name="phone" className="input" required inputMode="tel" autoComplete="tel" placeholder="0812-3456-7890" maxLength={25} />
      </div>
      <div>
        <label className="label" htmlFor="area">{t.form.area}</label>
        <select id="area" name="area" className="input" defaultValue="">
          <option value="">{t.form.areaPlaceholder}</option>
          {JABODETABEK_CITIES.map((c) => <option key={c} value={c}>{cityLabel(c)}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">{t.form.note}</label>
        <textarea id="note" name="note" className="input" rows={2} maxLength={200} />
      </div>
      {/* Honeypot: disembunyikan dari pengguna dan screen reader */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" />}
      {state.kind === "error" && <p role="alert" className="text-sm font-medium text-[var(--color-danger-600)]">{state.message}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={state.kind === "loading"}>
        {state.kind === "loading" ? t.cta.sending : t.form.submit}
      </button>
      <ul className="muted space-y-1 text-xs">
        <li>• {t.trust.sla}</li>
        <li>• {t.trust.priceLock}</li>
        <li>• {t.trust.noWarranty}</li>
      </ul>
    </form>
  );
}
