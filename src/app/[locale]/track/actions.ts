"use server";

import { revalidatePath } from "next/cache";
import { audit, clientIpHash } from "@/lib/admin";
import { db } from "@/lib/db";
import { normalizeIdPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { ALL_TRACK_STATUSES, normalizeCode, type TrackStatus } from "@/lib/track";

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
        order: { select: { deliveryMethod: true, deliveredBy: true, courier: true, trackingNumber: true, invoiceToken: true, shippedAt: true } },
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
    return {
      ok: true,
      data: {
        history,
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
    const inq = await db.inquiry.findUnique({ where: { code }, select: { id: true, phone: true, status: true, order: { select: { id: true, deliveredAt: true } } } });
    if (!inq || inq.phone !== phone) return { ok: false, error: "notFound" };
    if (inq.status === "DELIVERED") return { ok: true };
    if (inq.status !== "SHIPPED" || !inq.order) return { ok: false, error: "generic" };
    await db.$transaction([
      db.order.update({ where: { id: inq.order.id }, data: { deliveredAt: inq.order.deliveredAt ?? new Date() } }),
      db.inquiry.update({ where: { id: inq.id }, data: { status: "DELIVERED" } }),
      db.inquiryEvent.create({ data: { inquiryId: inq.id, type: "status_changed", data: { from: "SHIPPED", to: "DELIVERED", via: "customer" } } }),
    ]);
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
