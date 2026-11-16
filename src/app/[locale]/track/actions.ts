"use server";

import { clientIpHash } from "@/lib/admin";
import { db } from "@/lib/db";
import { normalizeIdPhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeCode, type TrackStatus } from "@/lib/track";

export interface TrackData {
  status: TrackStatus;
  productName: string;
  createdAt: string;
  quotedPrice: number | null;
  quoteExpiresAt: string | null;
  delivery: { method: "OWN_TEAM" | "COURIER"; deliveredBy: string | null; courier: string | null; trackingNumber: string | null } | null;
  invoiceToken: string | null;
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
        order: { select: { deliveryMethod: true, deliveredBy: true, courier: true, trackingNumber: true, invoiceToken: true, shippedAt: true } },
      },
    });
    if (!inq || inq.phone !== phone) return { ok: false, error: "notFound" };

    const snap = (inq.productSnapshot ?? {}) as { name?: string };
    const o = inq.order;
    const shipping = inq.status === "SHIPPED" || inq.status === "DELIVERED";
    return {
      ok: true,
      data: {
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
