"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { NOTE_MAX } from "@/lib/assignment";
import { addNoteAction, assignAction, type AssignState } from "./assign-actions";

type Entity = "inquiry" | "claim";

/** Penanggung jawab: ambil, lepas, atau (pengelola) tugaskan ke petugas lain. */
export function AssigneePanel({ entity, id, assignee, meId, users }: {
  entity: Entity; id: string; assignee: { id: string; name: string } | null; meId: string; users: Array<{ id: string; name: string }> | null;
}) {
  const [state, action, pending] = useActionState<AssignState, FormData>(assignAction, {});
  const mine = assignee?.id === meId;
  return (
    <section className="card space-y-3 p-5 text-sm">
      <h2 className="font-bold">Penanggung jawab</h2>
      <p className="flex items-center gap-2">
        <Icon name={assignee ? "user-check" : "user"} size={18} className="muted" />
        {assignee ? <span>{assignee.name}{mine && <span className="muted"> (Anda)</span>}</span> : <span className="muted">Belum diambil</span>}
      </p>
      <form action={action} className="flex flex-wrap gap-2">
        <input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={id} />
        {!mine && <button name="mode" value="take" disabled={pending} className="btn btn-primary btn-sm"><Icon name="user-check" size={16} />{assignee ? "Ambil alih" : "Ambil"}</button>}
        {assignee && <button name="mode" value="release" disabled={pending} className="btn btn-ghost btn-sm"><Icon name="user-minus" size={16} />Lepas</button>}
      </form>
      {users && users.length > 0 && (
        <form action={action} className="flex items-end gap-2">
          <input type="hidden" name="entity" value={entity} /><input type="hidden" name="id" value={id} /><input type="hidden" name="mode" value="assign" />
          <div className="min-w-0 flex-1">
            <label htmlFor={`assign-${entity}`} className="label">Tugaskan ke</label>
            <select id={`assign-${entity}`} name="targetId" className="input" defaultValue="" required>
              <option value="" disabled>Pilih petugas</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button disabled={pending} className="btn btn-ghost btn-sm">Tugaskan</button>
        </form>
      )}
      {state.error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{state.error}</p>}
    </section>
  );
}

export interface NoteItem { id: string; text: string; author: string; at: string }

/** Catatan tim berupa riwayat (terbaru di atas). Hanya terlihat oleh admin. */
export function NoteThread({ entity, id, notes }: { entity: Entity; id: string; notes: NoteItem[] }) {
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
      {notes.length === 0 ? <p className="muted text-sm">Belum ada catatan.</p> : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-[var(--line)] p-3 text-sm">
              <p className="whitespace-pre-line break-words">{n.text}</p>
              <p className="muted mt-1 text-xs">{n.author} · {n.at}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
