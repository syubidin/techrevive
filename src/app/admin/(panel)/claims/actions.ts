"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, requirePermission } from "@/lib/admin";
import { CLAIM_STATUSES, canClaimMove, claimNeedsReason, CLAIM_TERMINAL, type ClaimStatus } from "@/lib/claim-flow";

export interface ClaimActionState { ok?: boolean; error?: string }

const schema = z.object({
  id: z.string().cuid(),
  to: z.enum(CLAIM_STATUSES as unknown as [ClaimStatus, ...ClaimStatus[]]),
  resolution: z.string().trim().max(500).optional().transform((v) => v || null),
});

/** Mengubah status klaim. Transisi divalidasi dan ditulis atomik terhadap status yang dibaca (anti tabrakan antar petugas). */
export async function updateClaimStatus(_prev: ClaimActionState, formData: FormData): Promise<ClaimActionState> {
  const me = await requirePermission("claim.manage");
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: "Data tidak valid." };
  const { id, to, resolution } = p.data;
  const cur = await db.warrantyClaim.findUnique({ where: { id }, select: { status: true, assigneeId: true } });
  if (!cur) return { error: "Klaim tidak ditemukan." };
  if (!canClaimMove(cur.status, to)) return { error: "Perubahan status ini tidak diperbolehkan." };
  if (claimNeedsReason(to) && !resolution) return { error: "Alasan penolakan wajib diisi." };
  const terminal = (CLAIM_TERMINAL as readonly string[]).includes(to);
  const ok = await db.$transaction(async (tx) => {
    const r = await tx.warrantyClaim.updateMany({
      where: { id, status: cur.status },
      data: { status: to, ...(resolution ? { resolution } : {}), ...(terminal ? { resolvedAt: new Date() } : {}), ...(cur.assigneeId ? {} : { assigneeId: me.id }) },
    });
    if (r.count === 0) return false;
    await tx.claimEvent.create({ data: { claimId: id, type: "status_changed", actorId: me.id, data: { from: cur.status, to, ...(resolution ? { resolution } : {}) } } });
    return true;
  });
  if (!ok) return { error: "Status klaim baru saja berubah oleh petugas lain. Muat ulang halaman." };
  await audit(me.id, "claim.status", "WarrantyClaim", id, { from: cur.status, to });
  revalidatePath(`/admin/claims/${id}`);
  revalidatePath("/admin/claims");
  revalidatePath("/admin");
  return { ok: true };
}
