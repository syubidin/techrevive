"use client";

import { useState } from "react";
import type { Messages } from "@/lib/i18n";
import { Icon } from "./icons";

/** Menyusun pesan lalu membuka WhatsApp. Tidak ada data yang dikirim ke server kami. */
export function ContactForm({ t, waNumber }: { t: Messages["contactPage"]; waNumber: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = message.trim();
    if (!body) {
      setError(t.empty);
      return;
    }
    setError("");
    const who = name.trim();
    const text = `${who ? t.hello.replace("{name}", who) : t.helloAnon}\n\n${body}`;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 sm:p-6" noValidate>
      <div>
        <h2 className="text-xl font-bold">{t.formTitle}</h2>
        <p className="muted mt-1 text-sm">{t.formDesc}</p>
      </div>
      <div>
        <label className="label" htmlFor="c-name">{t.name}</label>
        <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="c-msg">{t.message}</label>
        <textarea id="c-msg" className="input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder={t.placeholder} aria-invalid={!!error} aria-describedby={error ? "c-err" : undefined} required />
        <p className="muted mt-1 text-right text-xs">{t.count.replace("{n}", String(message.length))}</p>
      </div>
      {error && <p id="c-err" role="alert" className="flex gap-2 text-sm font-medium text-[var(--color-danger-600)]"><Icon name="alert" size={18} className="shrink-0" />{error}</p>}
      <button type="submit" className="btn btn-accent btn-lg w-full"><Icon name="message-circle" />{t.send}</button>
    </form>
  );
}
