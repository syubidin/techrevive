"use server";

import { randomInt } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { audit, clientIpHash } from "@/lib/admin";
import { db } from "@/lib/db";
import { normalizeIdPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { ALL_TRACK_STATUSES, normalizeCode, type TrackStatus } from "@/lib/track";
import { claimBlocker, claimCode, cleanIssue, warrantyOf, type ClaimBlock } from "@/lib/warranty";
import { CLAIM_OPEN, type ClaimStatus } from "@/lib/claim-flow";
import { msgNewClaim, notify } from "@/lib/notify";
import { getEnv } from "@/lib/env";

export interface TrackData {
  status: TrackStatus;
  productName: string;
  createdAt: string;
  quotedPrice: number | null;
  quoteExpiresAt: string | null;
  delivery: { method: "OWN_TEAM" | "COURIER"; deliveredBy: string | null; courier: string | null; trackingNumber: string | null } | null;
  invoiceToken: string | null;
  /** Riwayat perubahan status yang aman dilihat pelanggan (lama ke baru). */
  history: Array<{ status: TrackStatus; at: string }>;
  /** Garansi dan klaim; null bila belum ada order. */
  warranty: {
    state: "none" | "active" | "expired";
    endsAt: string | null;
    daysLeft: number | null;
    blocker: ClaimBlock | null;
    claims: Array<{ code: string; status: ClaimStatus; issue: string; resolution: string | null; createdAt: string; cancellable: boolean }>;
  } | null;
}
export type TrackState = { ok: true; data: TrackData } | { ok: false; error: "notFound" | "rateLimited" | "generic" } | null;

/**
 * Cek status pesanan: wajib kode + nomor WhatsApp yang cocok. Kegagalan selalu pesan yang sama
 * (tidak membedakan "kode salah" dan "nomor salah") dan dibatasi per IP agar tidak bisa ditebak.
 */
export async function trackAction(_prev: TrackState, formData: FormData): Promise<TrackState> {
  try {
    const ip = await clientIpHash();
    const rl = await rateLimit(`track:${ip}`, 8, 600);
    if (!rl.allowed) return { ok: false, error: "rateLimited" };

    const code = normalizeCode(String(formData.get("code") ?? ""));
    const phone = normalizeIdPhone(String(formData.get("phone") ?? ""));
    if (!code || !phone) return { ok: false, error: "notFound" };

    const inq = await db.inquiry.findUnique({
      where: { code },
      select: {
        phone: true, status: true, createdAt: true, quotedPrice: true, quoteExpiresAt: true, productSnapshot: true,
        events: { where: { type: "status_changed" }, orderBy: { createdAt: "asc" }, take: 30, select: { createdAt: true, data: true } },
        order: {
          select: {
            id: true, deliveryMethod: true, deliveredBy: true, courier: true, trackingNumber: true, invoiceToken: true, shippedAt: true, deliveredAt: true, paidAt: true,
            claims: { orderBy: { createdAt: "desc" }, take: 10, select: { code: true, status: true, issue: true, resolution: true, createdAt: true } },
          },
        },
      },
    });
    if (!inq || inq.phone !== phone) return { ok: false, error: "notFound" };

    const snap = (inq.productSnapshot ?? {}) as { name?: string };
    const o = inq.order;
    const shipping = inq.status === "SHIPPED" || inq.status === "DELIVERED";
    const history: TrackData["history"] = [{ status: "NEW", at: inq.createdAt.toISOString() }];
    for (const e of inq.events) {
      const to = (e.data as { to?: string } | null)?.to;
      if (to && (ALL_TRACK_STATUSES as readonly string[]).includes(to) && history[history.length - 1].status !== to) history.push({ status: to as TrackStatus, at: e.createdAt.toISOString() });
    }
    let warranty: TrackData["warranty"] = null;
    if (o && inq.status === "DELIVERED") {
      const w = warrantyOf({ deliveredAt: o.deliveredAt, paidAt: o.paidAt });
      const open = o.claims.filter((c) => (CLAIM_OPEN as readonly string[]).includes(c.status)).length;
      warranty = {
        state: w.state,
        endsAt: w.state === "none" ? null : w.endsAt.toISOString(),
        daysLeft: w.state === "active" ? w.daysLeft : null,
        blocker: claimBlocker(w, open, o.claims.length),
        claims: o.claims.map((c) => ({
          code: c.code, status: c.status, issue: c.issue, resolution: c.resolution, createdAt: c.createdAt.toISOString(),
          cancellable: c.status === "SUBMITTED" || c.status === "REVIEWING",
        })),
      };
    }
    return {
      ok: true,
      data: {
        history,
        warranty,
        status: inq.status,
        productName: snap.name ?? "-",
        createdAt: inq.createdAt.toISOString(),
        quotedPrice: inq.quotedPrice,
        quoteExpiresAt: inq.quoteExpiresAt?.toISOString() ?? null,
        delivery: o && shipping ? { method: o.deliveryMethod, deliveredBy: o.deliveredBy, courier: o.courier, trackingNumber: o.trackingNumber } : null,
        invoiceToken: o?.invoiceToken ?? null,
      },
    };
  } catch (e) {
    console.error(JSON.stringify({ evt: "track.error", message: e instanceof Error ? e.message : "unknown" }));
    return { ok: false, error: "generic" };
  }
}

export type ConfirmState = { ok: true } | { ok: false; error: "notFound" | "rateLimited" | "generic" } | null;

/**
 * Pembeli mengonfirmasi barang sudah diterima. Wajib kode + nomor WhatsApp yang cocok (sama seperti Lacak Pesanan)
 * dan hanya berlaku saat status Dikirim. Hasilnya sama dengan admin menekan "Selesai".
 */
export async function confirmReceivedAction(formData: FormData): Promise<ConfirmState> {
  try {
    const ip = await clientIpHash();
    const rl = await rateLimit(`track-confirm:${ip}`, 8, 600);
    if (!rl.allowed) return { ok: false, error: "rateLimited" };
    const code = normalizeCode(String(formData.get("code") ?? ""));
    const phone = normalizeIdPhone(String(formData.get("phone") ?? ""));
    if (!code || !phone) return { ok: false, error: "notFound" };
    const inq = await db.inquiry.findUnique({ where: { code }, select: { id: true, phone: true, status: true, order: { select: { id: true, deliveredAt: true, paidAt: true } } } });
    if (!inq || inq.phone !== phone) return { ok: false, error: "notFound" };
    if (inq.status === "DELIVERED") return { ok: true };
    // Aturan sama dengan admin: "diterima" hanya sah untuk order yang sudah dicatat lunas dan sedang dikirim.
    if (inq.status !== "SHIPPED" || !inq.order || !inq.order.paidAt) return { ok: false, error: "generic" };
    const orderId = inq.order.id;
    // Atomik: hanya berhasil bila status MASIH "Dikirim" (admin bisa menyelesaikannya lebih dulu pada saat yang sama).
    const moved = await db.$transaction(async (tx) => {
      const r = await tx.inquiry.updateMany({ where: { id: inq.id, status: "SHIPPED" }, data: { status: "DELIVERED" } });
      if (r.count === 0) return false;
      await tx.order.update({ where: { id: orderId }, data: { deliveredAt: inq.order!.deliveredAt ?? new Date() } });
      await tx.inquiryEvent.create({ data: { inquiryId: inq.id, type: "status_changed", data: { from: "SHIPPED", to: "DELIVERED", via: "customer" } } });
      return true;
    });
    if (!moved) return { ok: true }; // sudah diselesaikan pihak lain; hasil akhirnya sama
    await audit(null, "order.confirm_received", "Order", inq.id, { via: "customer" });
    revalidatePath(`/admin/inquiries/${inq.id}`);
    revalidatePath("/admin");
    revalidatePath("/admin/inquiries");
    return { ok: true };
  } catch (e) {
    console.error(JSON.stringify({ evt: "track.confirm.error", message: e instanceof Error ? e.message : "unknown" }));
    return { ok: false, error: "generic" };
  }
}

export type ClaimActionState = { ok: true; code?: string } | { ok: false; error: "notFound" | "rateLimited" | "generic" | "invalidIssue" | ClaimBlock } | null;

/** Verifikasi kode + nomor WhatsApp, sama seperti Lacak Pesanan. Mengembalikan inquiry + order atau null. */
async function verifyBuyer(formData: FormData) {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  const phone = normalizeIdPhone(String(formData.get("phone") ?? ""));
  if (!code || !phone) return null;
  const inq = await db.inquiry.findUnique({
    where: { code },
    select: { id: true, phone: true, customerName: true, status: true, order: { select: { id: true, paidAt: true, deliveredAt: true } } },
  });
  if (!inq || inq.phone !== phone || !inq.order || inq.status !== "DELIVERED") return null;
  return { inq, order: inq.order };
}

/**
 * Pelanggan mengajukan klaim garansi. Hanya untuk order yang sudah selesai dan masih dalam masa garansi.
 * Baris order dikunci (FOR UPDATE) agar dua pengajuan bersamaan tidak lolos batas "satu klaim berjalan".
 */
export async function submitClaimAction(formData: FormData): Promise<ClaimActionState> {
  try {
    const ip = await clientIpHash();
    const rl = await rateLimit(`claim:${ip}`, 5, 600);
    if (!rl.allowed) return { ok: false, error: "rateLimited" };
    const issue = cleanIssue(String(formData.get("issue") ?? ""));
    if (!issue) return { ok: false, error: "invalidIssue" };
    const buyer = await verifyBuyer(formData);
    if (!buyer) return { ok: false, error: "notFound" };
    const orderId = buyer.order.id;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
          const o = await tx.order.findUnique({
            where: { id: orderId },
            select: { paidAt: true, deliveredAt: true, claims: { select: { status: true } } },
          });
          if (!o) return { kind: "blocked" as const, error: "notFound" as const };
          const open = o.claims.filter((c) => (CLAIM_OPEN as readonly string[]).includes(c.status)).length;
          const blocker = claimBlocker(warrantyOf(o), open, o.claims.length);
          if (blocker) return { kind: "blocked" as const, error: blocker };
          const code = claimCode(randomInt);
          const claim = await tx.warrantyClaim.create({ data: { code, orderId, issue, ipHash: ip } });
          await tx.claimEvent.create({ data: { claimId: claim.id, type: "submitted", data: { via: "customer" } } });
          return { kind: "ok" as const, claim };
        });
        if (result.kind === "blocked") return { ok: false, error: result.error };
        await audit(null, "claim.submit", "WarrantyClaim", result.claim.id, { code: result.claim.code, via: "customer" });
        revalidatePath("/admin/claims");
        revalidatePath("/admin");
        after(() => notify(msgNewClaim({ code: result.claim.code, inquiryCode: String(formData.get("code") ?? "").trim().toUpperCase(), customerName: buyer.inq.customerName }, getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, ""), result.claim.id)));
        return { ok: true, code: result.claim.code };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // kode bentrok, coba kode lain
        throw e;
      }
    }
    return { ok: false, error: "generic" };
  } catch (e) {
    console.error(JSON.stringify({ evt: "track.claim.error", message: e instanceof Error ? e.message : "unknown" }));
    return { ok: false, error: "generic" };
  }
}

/** Pelanggan membatalkan klaim yang belum disetujui. Atomik: hanya jika status masih Baru/Ditinjau. */
export async function cancelClaimAction(formData: FormData): Promise<ClaimActionState> {
  try {
    const ip = await clientIpHash();
    const rl = await rateLimit(`claim-cancel:${ip}`, 8, 600);
    if (!rl.allowed) return { ok: false, error: "rateLimited" };
    const buyer = await verifyBuyer(formData);
    const claimCodeRaw = String(formData.get("claimCode") ?? "").trim().toUpperCase();
    if (!buyer || !/^CL-\d{6}-[A-Z0-9]{4}$/.test(claimCodeRaw)) return { ok: false, error: "notFound" };
    const claim = await db.warrantyClaim.findFirst({ where: { code: claimCodeRaw, orderId: buyer.order.id }, select: { id: true } });
    if (!claim) return { ok: false, error: "notFound" };
    const done = await db.$transaction(async (tx) => {
      const r = await tx.warrantyClaim.updateMany({ where: { id: claim.id, status: { in: ["SUBMITTED", "REVIEWING"] } }, data: { status: "CANCELLED", resolvedAt: new Date() } });
      if (r.count === 0) return false;
      await tx.claimEvent.create({ data: { claimId: claim.id, type: "status_changed", data: { to: "CANCELLED", via: "customer" } } });
      return true;
    });
    if (!done) return { ok: false, error: "generic" };
    await audit(null, "claim.cancel", "WarrantyClaim", claim.id, { via: "customer" });
    revalidatePath("/admin/claims");
    revalidatePath(`/admin/claims/${claim.id}`);
    return { ok: true };
  } catch (e) {
    console.error(JSON.stringify({ evt: "track.claim.cancel.error", message: e instanceof Error ? e.message : "unknown" }));
    return { ok: false, error: "generic" };
  }
}
