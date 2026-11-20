"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { CLAIM_LABEL, type ClaimStatus } from "@/lib/claim-flow";
import { updateClaimStatus, type ClaimActionState } from "../actions";

/** Pilihan status berikutnya; alasan/catatan penyelesaian terlihat pelanggan di halaman Lacak. */
export function StatusForm({ id, options }: { id: string; options: ClaimStatus[] }) {
  const [state, action, pending] = useActionState<ClaimActionState, FormData>(updateClaimStatus, {});
  if (options.length === 0) return <p className="muted text-sm">Klaim ini sudah ditutup.</p>;
  return (
    <form action={action} className="space-y-3" data-confirm="Ubah status klaim? Catatan penyelesaian akan terlihat oleh pelanggan.">
      <input type="hidden" name="id" value={id} />
      <div>
        <label htmlFor="claim-to" className="label">Ubah status ke</label>
        <select id="claim-to" name="to" className="input" required defaultValue={options[0]}>
          {options.map((o) => <option key={o} value={o}>{CLAIM_LABEL[o]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="claim-res" className="label">Catatan untuk pelanggan (wajib bila ditolak)</label>
        <textarea id="claim-res" name="resolution" rows={3} maxLength={500} className="input" placeholder="Contoh: Unit dijemput Senin, estimasi 3 hari kerja." />
      </div>
      {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-green-700 dark:text-green-400">Status diperbarui.</p>}
      <button className="btn btn-primary" disabled={pending}><Icon name={pending ? "refresh" : "circle-check"} size={18} className={pending ? "animate-spin" : ""} />Simpan status</button>
    </form>
  );
}
