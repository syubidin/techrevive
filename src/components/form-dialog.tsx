"use client";

import { useRef } from "react";
import { Icon, type IconName } from "./icons";

/** Tombol yang membuka popup berisi form (tambah/ubah). Popup menutup otomatis saat form dikirim. */
export function FormDialog({ label, title, icon, variant = "ghost", size = "sm", children }: { label: string; title: string; icon?: IconName; variant?: "primary" | "ghost"; size?: "sm" | "md"; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={`btn btn-${variant} ${size === "sm" ? "btn-sm" : ""}`} onClick={() => ref.current?.showModal()}>
        {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}{label}
      </button>
      <dialog
        ref={ref}
        className="dialog dialog-wide"
        aria-label={title}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        onSubmit={() => ref.current?.close()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4 sm:px-6">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm !px-2" aria-label="Tutup" onClick={() => ref.current?.close()}><Icon name="x" size={16} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6" data-dialog-body>{children}</div>
      </dialog>
    </>
  );
}
