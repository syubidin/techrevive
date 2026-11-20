/** Aturan penugasan inquiry/klaim (murni, diuji). Pemeriksaan izin tetap dilakukan di server action. */
export type AssignMode = "take" | "release" | "assign";
export type AssignError = "taken" | "forbidden" | "target" | "closed";
export type AssignDecision =
  | { ok: true; assigneeId: string | null; noop: boolean }
  | { ok: false; error: AssignError };

/** Status akhir: penugasan terkunci dan tidak bisa diubah lagi. */
export const INQUIRY_CLOSED = ["DELIVERED", "CANCELLED", "EXPIRED"] as const;
export const CLAIM_CLOSED = ["RESOLVED", "REJECTED", "CANCELLED"] as const;
export const isInquiryClosed = (s: string): boolean => (INQUIRY_CLOSED as readonly string[]).includes(s);
export const isClaimClosed = (s: string): boolean => (CLAIM_CLOSED as readonly string[]).includes(s);

export interface AssignInput {
  mode: AssignMode;
  meId: string;
  /** Owner/Developer: boleh menugaskan ke orang lain. */
  canManageOthers: boolean;
  currentAssigneeId: string | null;
  targetId?: string | null;
  /** Inquiry/klaim sudah selesai. */
  closed: boolean;
}

export function decideAssignment(i: AssignInput): AssignDecision {
  const { mode, meId, canManageOthers, currentAssigneeId: cur } = i;
  if (i.closed) return { ok: false, error: "closed" };
  if (mode === "take") {
    // Mengambil hanya untuk yang belum ditugaskan. Milik orang lain tidak bisa diambil, termasuk oleh Owner (pakai "Tugaskan ke").
    if (cur === meId) return { ok: true, assigneeId: meId, noop: true };
    if (cur === null) return { ok: true, assigneeId: meId, noop: false };
    return { ok: false, error: "taken" };
  }
  if (mode === "release") {
    if (cur === null) return { ok: true, assigneeId: null, noop: true };
    // Hanya penanggung jawab sendiri yang bisa melepas.
    if (cur === meId) return { ok: true, assigneeId: null, noop: false };
    return { ok: false, error: "forbidden" };
  }
  if (!canManageOthers) return { ok: false, error: "forbidden" };
  if (!i.targetId) return { ok: false, error: "target" };
  return { ok: true, assigneeId: i.targetId, noop: cur === i.targetId };
}

/** Tombol apa yang ditampilkan. Sumber kebenaran UI; server tetap memeriksa ulang lewat decideAssignment. */
export function assignUi(i: { meId: string; canManageOthers: boolean; currentAssigneeId: string | null; closed: boolean }) {
  if (i.closed) return { canTake: false, canRelease: false, canAssign: false };
  return {
    canTake: i.currentAssigneeId === null,
    canRelease: i.currentAssigneeId === i.meId,
    canAssign: i.canManageOthers,
  };
}

export const NOTE_MAX = 1000;
/** Catatan tim dirapikan; null jika kosong/terlalu panjang. */
export function cleanNote(raw: string): string | null {
  const t = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return t.length >= 1 && t.length <= NOTE_MAX ? t : null;
}

export const UNASSIGNED_LABEL = "Belum ditugaskan";

export const ASSIGN_ERROR: Record<AssignError, string> = {
  taken: "Sudah ditugaskan ke petugas lain.",
  forbidden: "Anda tidak berhak mengubah penugasan ini.",
  target: "Pilih petugas tujuan.",
  closed: "Sudah selesai, penugasan tidak bisa diubah lagi.",
};
