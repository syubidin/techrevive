/** Aturan penugasan inquiry/klaim (murni, diuji). Pemeriksaan izin tetap dilakukan di server action. */
export type AssignMode = "take" | "release" | "assign";
export type AssignDecision =
  | { ok: true; assigneeId: string | null; noop: boolean }
  | { ok: false; error: "taken" | "forbidden" | "target" };

export interface AssignInput {
  mode: AssignMode;
  meId: string;
  /** Punya izin menugaskan orang lain / mengambil alih. */
  canManageOthers: boolean;
  currentAssigneeId: string | null;
  targetId?: string | null;
}

export function decideAssignment(i: AssignInput): AssignDecision {
  const { mode, meId, canManageOthers, currentAssigneeId: cur } = i;
  if (mode === "take") {
    if (cur === meId) return { ok: true, assigneeId: meId, noop: true };
    if (cur === null || canManageOthers) return { ok: true, assigneeId: meId, noop: false };
    return { ok: false, error: "taken" };
  }
  if (mode === "release") {
    if (cur === null) return { ok: true, assigneeId: null, noop: true };
    if (cur === meId || canManageOthers) return { ok: true, assigneeId: null, noop: false };
    return { ok: false, error: "forbidden" };
  }
  if (!canManageOthers) return { ok: false, error: "forbidden" };
  if (!i.targetId) return { ok: false, error: "target" };
  return { ok: true, assigneeId: i.targetId, noop: cur === i.targetId };
}

export const NOTE_MAX = 1000;
/** Catatan tim dirapikan; null jika kosong/terlalu panjang. */
export function cleanNote(raw: string): string | null {
  const t = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return t.length >= 1 && t.length <= NOTE_MAX ? t : null;
}

export const ASSIGN_ERROR: Record<"taken" | "forbidden" | "target", string> = {
  taken: "Sudah ditangani petugas lain.",
  forbidden: "Anda tidak berhak mengubah penugasan ini.",
  target: "Pilih petugas tujuan.",
};
