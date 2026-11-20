"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { NOTE_MAX, UNASSIGNED_LABEL } from "@/lib/assignment";
import { addNoteAction, assignAction, type AssignState } from "./assign-actions";

type Entity = "inquiry" | "claim";

/**
 * Penanggung jawab. Tombol yang tampil ditentukan `ui` (lib/assignment.ts, dihitung di server):
 * Ambil (belum ditugaskan), Lepas (hanya milik sendiri), Tugaskan/Alihkan (Owner/Developer).
 * Petugas yang melihat tugas orang lain, atau tugas yang sudah selesai, hanya melihat informasinya.
 */
export function AssigneePanel({ entity, id, assignee, meId, ui, closed, users }: {
  entity: Entity; id: string; assignee: { id: string; name: string } | null; meId: string;
  ui: { canTake: boolean; canRelease: boolean; canAssign: boolean }; closed: boolean; users: Array<{ id: string; name: string }> | null;
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assignAction, {});
  const options = (users ?? []).filter((u) => u.id !== assignee?.id);
  const hidden = (<><input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={id} /></>);
  return (
    <section className="card space-y-3 p-5 text-sm" aria-labelledby={`assignee-${entity}`}>
      <h2 id={`assignee-${entity}`} className="font-bold">Penanggung jawab</h2>
      <p className="flex items-center gap-2">
        <Icon name={assignee ? "user-check" : "user"} size={18} className="muted shrink-0" />
        {assignee
          ? <span className="min-w-0 break-words font-semibold">{assignee.name}{assignee.id === meId && <span className="muted font-normal"> (Anda)</span>}</span>
          : <span className="muted">{UNASSIGNED_LABEL}</span>}
      </p>
      {closed && <p className="muted flex gap-2 text-xs"><Icon name="info" size={14} className="mt-0.5 shrink-0" />Sudah selesai, penugasan tidak bisa diubah lagi.</p>}

      {(ui.canTake || ui.canRelease) && (
        <form action={action} className="flex flex-wrap gap-2">
          {hidden}
          {ui.canTake && <button name="mode" value="take" disabled={pending} className="btn btn-primary btn-sm"><Icon name="user-check" size={16} />Ambil tugas ini</button>}
          {ui.canRelease && <button name="mode" value="release" disabled={pending} className="btn btn-ghost btn-sm"><Icon name="user-minus" size={16} />Lepas tugas</button>}
        </form>
      )}

      {ui.canAssign && options.length > 0 && (
        <form action={action} className="space-y-2 border-t border-[var(--line)] pt-3">
          {hidden}<input type="hidden" name="mode" value="assign" />
          <label htmlFor={`assign-${entity}`} className="label">{assignee ? "Alihkan ke" : "Tugaskan ke"}</label>
          <div className="flex gap-2">
            <select id={`assign-${entity}`} name="targetId" className="input min-w-0 flex-1" defaultValue="" required>
              <option value="" disabled>Pilih petugas</option>
              {options.map((u) => <option key={u.id} value={u.id}>{u.name}{u.id === meId ? " (Anda)" : ""}</option>)}
            </select>
            <button disabled={pending} className="btn btn-ghost btn-sm shrink-0">Simpan</button>
          </div>
        </form>
      )}
      {state.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</p>}
    </section>
  );
}

export interface NoteItem { id: string; text: string; author: string; at: string }

/** Catatan tim berupa riwayat (terbaru di atas). Hanya terlihat oleh admin. */
export function NoteThread({ entity, id, notes, legacy }: { entity: Entity; id: string; notes: NoteItem[]; legacy?: string | null }) {
  const [state, action, pending] = useActionState<AssignState, FormData>(async (prev, fd) => {
    const r = await addNoteAction(prev, fd);
    if (r.ok) (document.getElementById(`note-${entity}`) as HTMLTextAreaElement | null)?.form?.reset();
    return r;
  }, {});
  return (
    <section className="card space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-bold"><Icon name="message-square" size={18} />Catatan tim</h2>
      <form action={action} className="space-y-2">
        <input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={id} />
        <label htmlFor={`note-${entity}`} className="sr-only">Tambah catatan</label>
        <textarea id={`note-${entity}`} name="text" className="input min-h-20" maxLength={NOTE_MAX} required placeholder="Tulis catatan untuk rekan tim (tidak terlihat pelanggan)" />
        <div className="flex items-center gap-3">
          <button disabled={pending} className="btn btn-primary btn-sm"><Icon name={pending ? "refresh" : "send"} size={16} className={pending ? "animate-spin" : ""} />Tambah catatan</button>
          {state.error && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</span>}
        </div>
      </form>
      {notes.length === 0 && !legacy ? <p className="muted text-sm">Belum ada catatan.</p> : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
              <p className="whitespace-pre-line break-words">{n.text}</p>
              <p className="muted mt-1 text-xs">{n.author} · {n.at}</p>
            </li>
          ))}
          {legacy && (
            <li className="rounded-lg border border-dashed border-[var(--line)] p-3 text-sm">
              <p className="whitespace-pre-line break-words">{legacy}</p>
              <p className="muted mt-1 text-xs">Catatan sebelumnya</p>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
