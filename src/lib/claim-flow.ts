/** Alur status klaim garansi (murni, diuji). */
export type ClaimStatus = "SUBMITTED" | "REVIEWING" | "APPROVED" | "IN_SERVICE" | "READY" | "RESOLVED" | "REJECTED" | "CANCELLED";

export const CLAIM_STATUSES: readonly ClaimStatus[] = ["SUBMITTED", "REVIEWING", "APPROVED", "IN_SERVICE", "READY", "RESOLVED", "REJECTED", "CANCELLED"];

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  SUBMITTED: "Baru", REVIEWING: "Ditinjau", APPROVED: "Disetujui", IN_SERVICE: "Diservis", READY: "Siap dikembalikan",
  RESOLVED: "Selesai", REJECTED: "Ditolak", CANCELLED: "Dibatalkan",
};

export const CLAIM_TERMINAL: readonly ClaimStatus[] = ["RESOLVED", "REJECTED", "CANCELLED"];
export const CLAIM_OPEN: readonly ClaimStatus[] = ["SUBMITTED", "REVIEWING", "APPROVED", "IN_SERVICE", "READY"];

const NEXT: Record<ClaimStatus, readonly ClaimStatus[]> = {
  SUBMITTED: ["REVIEWING", "APPROVED", "REJECTED", "CANCELLED"],
  REVIEWING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["IN_SERVICE", "READY", "CANCELLED"],
  IN_SERVICE: ["READY", "CANCELLED"],
  READY: ["RESOLVED", "IN_SERVICE"],
  RESOLVED: [],
  REJECTED: [],
  CANCELLED: [],
};

export const isClaimStatus = (v: unknown): v is ClaimStatus => typeof v === "string" && (CLAIM_STATUSES as readonly string[]).includes(v);
export const claimNext = (from: ClaimStatus): readonly ClaimStatus[] => NEXT[from];
export const canClaimMove = (from: ClaimStatus, to: ClaimStatus): boolean => NEXT[from].includes(to);
/** Penolakan wajib disertai alasan yang terlihat pelanggan. */
export const claimNeedsReason = (to: ClaimStatus): boolean => to === "REJECTED";
export const isClaimOpen = (s: ClaimStatus): boolean => (CLAIM_OPEN as readonly string[]).includes(s);
