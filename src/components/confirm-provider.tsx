"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

interface Pending { form: HTMLFormElement; submitter: HTMLElement | null; title: string; body: string; label: string; danger: boolean }

const DANGER = /hapus|keluar|arsip|putus|batal|cabut|nonaktif|tolak|buang/i;

/**
 * Popup konfirmasi global untuk semua tombol aksi di admin. Tidak perlu mengubah tiap tombol: setiap
 * pengiriman form (selain pencarian/filter) dicegat, ditanyakan dulu, lalu dikirim ulang bila disetujui.
 * Opsional per tombol: data-confirm="Teks penjelasan", data-danger, data-no-confirm (form/tombol).
 */
export function ConfirmProvider() {
  const [pending, setPending] = useState<Pending | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const bypass = useRef(false);

  useEffect(() => {
    const onSubmit = (e: SubmitEvent) => {
      if (bypass.current) { bypass.current = false; return; }
      const form = e.target as HTMLFormElement;
      const submitter = (e.submitter as HTMLElement | null) ?? (form.querySelector('button:not([type="button"]), input[type="submit"]') as HTMLElement | null);
      if (form.closest("[data-no-confirm]") || submitter?.closest("[data-no-confirm]")) return;
      if (form.getAttribute("role") === "search" || form.getAttribute("method")?.toLowerCase() === "get") return;
      const label = (submitter?.getAttribute("aria-label") ?? submitter?.textContent ?? "Lanjutkan").replace(/\s+/g, " ").trim() || "Lanjutkan";
      const danger = submitter?.hasAttribute("data-danger") || DANGER.test(label) || !!submitter?.getAttribute("data-confirm")?.match(DANGER);
      const custom = submitter?.getAttribute("data-confirm") ?? form.getAttribute("data-confirm");
      e.preventDefault();
      e.stopImmediatePropagation();
      setPending({ form, submitter, label, danger, title: `${label}?`, body: custom ?? (danger ? "Tindakan ini tidak bisa dibatalkan." : "Pastikan data sudah benar sebelum dilanjutkan.") });
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (pending && d && !d.open) d.showModal();
  }, [pending]);

  const close = () => { dialog.current?.close(); setPending(null); };
  const confirm = () => {
    const p = pending;
    close();
    if (!p) return;
    bypass.current = true;
    try { p.form.requestSubmit(p.submitter instanceof HTMLButtonElement || p.submitter instanceof HTMLInputElement ? p.submitter : undefined); } catch { p.form.requestSubmit(); }
    bypass.current = false;
  };

  return (
    <dialog ref={dialog} className="dialog" onClose={() => setPending(null)} onClick={(e) => { if (e.target === dialog.current) close(); }} aria-labelledby="confirm-title">
      {pending && (
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${pending.danger ? "bg-red-500/10 text-red-600" : "bg-brand-500/10 text-brand-600"}`}><Icon name={pending.danger ? "alert" : "circle-check"} size={20} /></span>
            <div className="min-w-0">
              <h2 id="confirm-title" className="text-base font-extrabold">{pending.title}</h2>
              <p className="muted mt-1 text-sm">{pending.body}</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={close} autoFocus>Batal</button>
            <button type="button" className={`btn ${pending.danger ? "btn-danger-solid" : "btn-primary"}`} onClick={confirm}>{pending.label}</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
