"use server";

import { revalidatePath } from "next/cache";
import type { ClaimStatus, InquiryStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, can, requirePermission } from "@/lib/admin";
import { ASSIGN_ERROR, CLAIM_CLOSED, INQUIRY_CLOSED, cleanNote, decideAssignment, isClaimClosed, isInquiryClosed } from "@/lib/assignment";

export interface AssignState { ok?: boolean; error?: string }

const entitySchema = z.enum(["inquiry", "claim"]);
const assignSchema = z.object({
  entity: entitySchema,
  id: z.string().cuid(),
  mode: z.enum(["take", "release", "assign"]),
  targetId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
});

const paths = (entity: "inquiry" | "claim", id: string) =>
  entity === "inquiry" ? [`/admin/inquiries/${id}`, "/admin/inquiries", "/admin"] : [`/admin/claims/${id}`, "/admin/claims", "/admin"];

/**
 * Ambil / lepas / tugaskan inquiry atau klaim. Perubahan ditulis dengan updateMany bersyarat
 * (penanggung jawab harus MASIH sama seperti yang dibaca), jadi dua petugas yang menekan "Ambil"
 * bersamaan tidak saling menimpa: yang kedua mendapat pesan "sudah ditangani".
 */
export async function assignAction(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const me = await requirePermission("inquiry.assign");
  const p = assignSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: "Data tidak valid." };
  const { entity, id, mode, targetId } = p.data;
  const canManageOthers = can(me.role, "inquiry.assignOthers");

  const row = entity === "inquiry"
    ? await db.inquiry.findUnique({ where: { id }, select: { assigneeId: true, status: true } })
    : await db.warrantyClaim.findUnique({ where: { id }, select: { assigneeId: true, status: true } });
  if (!row) return { error: "Data tidak ditemukan." };
  const closed = entity === "inquiry" ? isInquiryClosed(row.status) : isClaimClosed(row.status);

  if (mode === "assign" && !closed) {
    const target = await db.adminUser.findFirst({ where: { id: targetId ?? "", isActive: true }, select: { id: true } });
    if (!target) return { error: ASSIGN_ERROR.target };
  }
  const dec = decideAssignment({ mode, meId: me.id, canManageOthers, currentAssigneeId: row.assigneeId, targetId, closed });
  if (!dec.ok) return { error: ASSIGN_ERROR[dec.error] };
  if (dec.noop) return { ok: true };

  // Pembaruan bersyarat: penanggung jawab dan status harus MASIH seperti yang dibaca (anti tabrakan, anti perubahan setelah selesai).
  const changed = await db.$transaction(async (tx) => {
    const r = entity === "inquiry"
      ? await tx.inquiry.updateMany({
          where: { id, assigneeId: row.assigneeId, status: { notIn: [...INQUIRY_CLOSED] as InquiryStatus[] } },
          data: { assigneeId: dec.assigneeId, assignedAt: dec.assigneeId ? new Date() : null },
        })
      : await tx.warrantyClaim.updateMany({
          where: { id, assigneeId: row.assigneeId, status: { notIn: [...CLAIM_CLOSED] as ClaimStatus[] } },
          data: { assigneeId: dec.assigneeId },
        });
    if (r.count === 0) return false;
    const ev = { type: "assigned", actorId: me.id, data: { from: row.assigneeId, to: dec.assigneeId, mode } };
    if (entity === "inquiry") await tx.inquiryEvent.create({ data: { inquiryId: id, ...ev } });
    else await tx.claimEvent.create({ data: { claimId: id, ...ev } });
    return true;
  });
  if (!changed) return { error: "Data baru saja berubah. Muat ulang halaman lalu coba lagi." };

  await audit(me.id, `${entity}.assign`, entity === "inquiry" ? "Inquiry" : "WarrantyClaim", id, { from: row.assigneeId, to: dec.assigneeId });
  for (const path of paths(entity, id)) revalidatePath(path);
  return { ok: true };
}

const noteSchema = z.object({ entity: entitySchema, id: z.string().cuid(), text: z.string() });

/** Menambah catatan tim (riwayat, tidak menimpa catatan sebelumnya). Terlihat hanya oleh admin. */
export async function addNoteAction(_prev: AssignState, formData: FormData): Promise<AssignState> {
  const me = await requirePermission("inquiry.assign");
  const p = noteSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return { error: "Data tidak valid." };
  const text = cleanNote(p.data.text);
  if (!text) return { error: "Catatan harus 1 sampai 1000 karakter." };
  const { entity, id } = p.data;
  const exists = entity === "inquiry"
    ? await db.inquiry.findUnique({ where: { id }, select: { id: true } })
    : await db.warrantyClaim.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return { error: "Data tidak ditemukan." };
  if (entity === "inquiry") await db.inquiryEvent.create({ data: { inquiryId: id, type: "note", actorId: me.id, data: { text } } });
  else await db.claimEvent.create({ data: { claimId: id, type: "note", actorId: me.id, data: { text } } });
  await audit(me.id, `${entity}.note_add`, entity === "inquiry" ? "Inquiry" : "WarrantyClaim", id);
  revalidatePath(entity === "inquiry" ? `/admin/inquiries/${id}` : `/admin/claims/${id}`);
  return { ok: true };
}
