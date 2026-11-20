"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icons";
import { followUpPresets } from "@/lib/follow-up";
import { saveFollowUp, type ActionState } from "../actions";

/** Jadwal follow-up: pilih cepat (Besok / 3 hari / 1 minggu) atau tanggal sendiri, lalu Simpan. Kosongkan untuk menghapus. */
export function FollowUpCard({ inquiryId, value, label }: { inquiryId: string; value: string; label: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveFollowUp, {});
  const [v, setV] = useState(value);
  const presets = followUpPresets();
  return (
    <form action={action} className="card space-y-3 p-5 text-sm" aria-labelledby="followup-h">
      <h2 id="followup-h" className="flex items-center gap-2 font-bold"><Icon name="clock" size={18} />Follow-up</h2>
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <p className={label ? "font-semibold" : "muted"}>{label ?? "Belum dijadwalkan"}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat">
        {presets.map((p) => (
          <button key={p.key} type="button" onClick={() => setV(p.value)} aria-pressed={v === p.value} className={`chip !min-h-9 ${v === p.value ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{p.label}</button>
        ))}
      </div>
      <div>
        <label htmlFor="followUpAt" className="label">Atau pilih waktu (WIB)</label>
        <input id="followUpAt" name="followUpAt" type="datetime-local" className="input" value={v} onChange={(e) => setV(e.target.value)} />
      </div>
      {state.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="text-xs text-green-700 dark:text-green-400">Tersimpan.</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Menyimpan…" : v ? "Simpan jadwal" : "Simpan"}</button>
        {(v || value) && <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setV("")}>Kosongkan</button>}
      </div>
      {!v && value && <p className="muted text-xs">Tekan Simpan untuk menghapus jadwal.</p>}
    </form>
  );
}
