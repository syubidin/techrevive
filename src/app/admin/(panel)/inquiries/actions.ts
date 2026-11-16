"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { audit, requireAdmin, requirePermission } from "@/lib/admin";
import { ALL_STATUSES, checkStatusChange } from "@/lib/status-guard";
import { planStockAdjustment } from "@/lib/stock";
import { newInvoiceToken } from "@/lib/invoice";
import { redirect } from "next/navigation";
import { canDeleteInquiry } from "@/lib/delete-guard";
import { resolveDelivery, shouldAdvance } from "@/lib/order-flow";
import { site } from "@/config/site";

export interface ActionState { ok?: boolean; error?: string }

const STATUSES = ALL_STATUSES as unknown as [string, ...string[]];
const intField = (max = 2_000_000_000) => z.coerce.number().int().min(0).max(max);

const updateSchema = z.object({
  id: z.string().cuid(),
  expectedUpdatedAt: z.string().datetime(),
  status: z.enum(STATUSES),
  quotedPrice: z.union([z.literal(""), intField()]).transform((v) => (v === "" ? null : v)),
  quoteValidHours: z.coerce.number().int().min(1).max(168).default(site.quoteValidHours),
  internalNote: z.string().trim().max(2000).optional().transform((v) => v || null),
  // datetime-local dikirim tanpa zona waktu: dianggap WIB (UTC+7)
  followUpAt: z.string().optional().transform((v) => (v ? new Date(`${v}:00+07:00`) : null)),
});

export async function updateInquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Data tidak valid. Periksa harga, tanggal, dan status." };
  const d = parsed.data;
  if (d.followUpAt && Number.isNaN(d.followUpAt.getTime())) return { error: "Tanggal follow-up tidak valid." };

  const current = await db.inquiry.findUnique({ where: { id: d.id }, include: { order: { select: { paidAt: true } } } });
  if (!current) return { error: "Inquiry tidak ditemukan." };
  const guardError = checkStatusChange({ role: me.role, current: current.status, target: d.status as typeof current.status, orderPaid: !!current.order?.paidAt });
  if (guardError) return { error: guardError };
  if (d.status === "QUOTED" && !d.quotedPrice) return { error: "Isi harga penawaran sebelum status “Quoted”." };
  if (d.quotedPrice && d.quotedPrice < 1) return { error: "Harga penawaran harus lebih dari 0." };

  const statusChanged = d.status !== current.status;
  const quoteExpiresAt = d.status === "QUOTED" && (statusChanged || current.quotedPrice !== d.quotedPrice)
    ? new Date(Date.now() + d.quoteValidHours * 3600 * 1000)
    : current.quoteExpiresAt;

  // Optimistic locking: tolak jika admin lain mengubah data setelah halaman ini dimuat.
  const res = await db.inquiry.updateMany({
    where: { id: d.id, updatedAt: new Date(d.expectedUpdatedAt) },
    data: { status: d.status as typeof current.status, quotedPrice: d.quotedPrice, quoteExpiresAt, internalNote: d.internalNote, followUpAt: d.followUpAt },
  });
  if (res.count === 0) return { error: "Data sudah diubah admin lain. Muat ulang halaman lalu coba lagi." };

  if (statusChanged) await db.inquiryEvent.create({ data: { inquiryId: d.id, type: "status_changed", actorId: me.id, data: { from: current.status, to: d.status } } });
  if (current.quotedPrice !== d.quotedPrice && d.quotedPrice) await db.inquiryEvent.create({ data: { inquiryId: d.id, type: "quote_set", actorId: me.id, data: { price: d.quotedPrice } } });
  await audit(me.id, "inquiry.update", "Inquiry", d.id, { status: [current.status, d.status], quotedPrice: [current.quotedPrice, d.quotedPrice] });

  revalidatePath(`/admin/inquiries/${d.id}`);
  revalidatePath("/admin/inquiries");
  return { ok: true };
}

const orderSchema = z.object({
  inquiryId: z.string().cuid(),
  itemPrice: intField(),
  itemCost: intField(),
  shippingFee: intField(50_000_000),
  insuranceFee: intField(50_000_000),
  paymentFee: intField(50_000_000),
  paymentMethod: z.union([z.literal(""), z.enum(["BANK_TRANSFER", "VIRTUAL_ACCOUNT", "QRIS"])]).transform((v) => (v === "" ? null : (v as PaymentMethod))),
  paid: z.string().optional(),
  deliveryMethod: z.enum(["OWN_TEAM", "COURIER"]),
  deliveredBy: z.string().trim().max(60).optional().transform((v) => v || null),
  deliveryNote: z.string().trim().max(500).optional().transform((v) => v || null),
  courier: z.string().trim().max(40).optional().transform((v) => v || null),
  trackingNumber: z.string().trim().max(60).optional().transform((v) => v || null),
  dispatched: z.string().optional(),
  delivered: z.string().optional(),
});

export async function saveOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("order.write");
  const parsed = orderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Data order tidak valid." };
  return saveOrderCore(me, parsed.data);
}

type OrderInput = z.output<typeof orderSchema>;
type Me = Awaited<ReturnType<typeof requireAdmin>>;

/** Inti penyimpanan order (dipakai form "Koreksi order" dan tombol langkah). Izin diperiksa oleh pemanggil. */
async function saveOrderCore(me: Me, d: OrderInput): Promise<ActionState> {
  if (d.itemPrice < 1) return { error: "Harga jual harus lebih dari 0." };
  if (d.paid && !d.paymentMethod) return { error: "Pilih metode pembayaran sebelum menandai lunas." };

  const inquiry = await db.inquiry.findUnique({ where: { id: d.inquiryId }, include: { order: true, product: { select: { id: true, stockQty: true } } } });
  if (!inquiry) return { error: "Inquiry tidak ditemukan." };
  if (["CANCELLED", "EXPIRED"].includes(inquiry.status)) return { error: "Inquiry sudah dibatalkan/kedaluwarsa. Buka ulang dulu." };

  const flow = resolveDelivery({
    method: d.deliveryMethod,
    paid: !!d.paid,
    dispatched: !!d.dispatched,
    delivered: !!d.delivered,
    courier: d.courier,
    trackingNumber: d.trackingNumber,
    deliveredBy: d.deliveredBy,
  });
  if (flow.error) return { error: flow.error };

  const own = d.deliveryMethod === "OWN_TEAM";
  const total = d.itemPrice + d.shippingFee + d.insuranceFee;
  const paidAt = d.paid ? inquiry.order?.paidAt ?? new Date() : null;
  const shippedAt = flow.dispatched ? inquiry.order?.shippedAt ?? new Date() : null;
  const deliveredAt = flow.delivered ? inquiry.order?.deliveredAt ?? new Date() : null;
  const data = {
    itemPrice: d.itemPrice, itemCost: d.itemCost, shippingFee: d.shippingFee, insuranceFee: d.insuranceFee, paymentFee: d.paymentFee, total,
    paymentMethod: d.paymentMethod, paidAt,
    deliveryMethod: d.deliveryMethod, deliveryNote: d.deliveryNote,
    // Kolom yang tidak relevan untuk metode terpilih dikosongkan agar data tidak ganda.
    deliveredBy: own ? d.deliveredBy : null,
    courier: own ? null : d.courier,
    trackingNumber: own ? null : d.trackingNumber,
    shippedAt, deliveredAt,
  };
  const stock = planStockAdjustment({
    stockQty: inquiry.product.stockQty,
    paidBefore: !!inquiry.order?.paidAt,
    paidNow: !!paidAt,
    autoApplied: !!inquiry.order?.stockAutoApplied,
  });

  await db.$transaction(async (tx) => {
    const stockData = { stockAutoApplied: stock.autoApplied };
    await tx.order.upsert({ where: { inquiryId: d.inquiryId }, create: { inquiryId: d.inquiryId, ...data, ...stockData }, update: { ...data, ...stockData } });
    if (stock.action !== "none") {
      // Atomik: kurangi/pulihkan relatif terhadap nilai terbaru agar dua order bersamaan tidak saling menimpa.
      if (stock.action === "decrement") {
        await tx.product.updateMany({ where: { id: inquiry.product.id, stockQty: { gt: 0 } }, data: { stockQty: { decrement: 1 } } });
        if (stock.markSoldOut) await tx.product.update({ where: { id: inquiry.product.id }, data: { availability: "SOLD_OUT" } });
      } else {
        await tx.product.update({ where: { id: inquiry.product.id }, data: { stockQty: { increment: 1 }, ...(stock.reopen ? { availability: "CHECK" } : {}) } });
      }
      await tx.inquiryEvent.create({ data: { inquiryId: d.inquiryId, type: "stock_adjusted", actorId: me.id, data: { action: stock.action, newQty: stock.newQty, soldOut: stock.markSoldOut } } });
    }
    // Maju otomatis hanya ke depan; tidak pernah memundurkan status.
    if (shouldAdvance(inquiry.status, flow.status)) {
      await tx.inquiry.update({ where: { id: d.inquiryId }, data: { status: flow.status } });
      await tx.inquiryEvent.create({ data: { inquiryId: d.inquiryId, type: "status_changed", actorId: me.id, data: { from: inquiry.status, to: flow.status, via: "order", delivery: d.deliveryMethod } } });
    }
  });
  await audit(me.id, "order.save", "Order", d.inquiryId, { total, paid: !!d.paid, delivery: d.deliveryMethod, status: flow.status, stock: stock.action });
  revalidatePath(`/admin/inquiries/${d.inquiryId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inquiries");
  return { ok: true };
}

/** Data order yang tersimpan, diubah kembali ke bentuk input agar langkah-langkah kecil bisa memakai saveOrderCore. */
async function loadOrderInput(inquiryId: string): Promise<{ input: OrderInput; exists: boolean; costPrice: number; quotedPrice: number | null } | null> {
  const inq = await db.inquiry.findUnique({ where: { id: inquiryId }, include: { order: true, product: { select: { costPrice: true } } } });
  if (!inq) return null;
  const o = inq.order;
  return {
    exists: !!o,
    costPrice: inq.product.costPrice,
    quotedPrice: inq.quotedPrice,
    input: {
      inquiryId,
      itemPrice: o?.itemPrice ?? inq.quotedPrice ?? 0,
      itemCost: o?.itemCost ?? inq.product.costPrice,
      shippingFee: o?.shippingFee ?? 0,
      insuranceFee: o?.insuranceFee ?? 0,
      paymentFee: o?.paymentFee ?? 0,
      paymentMethod: o?.paymentMethod ?? null,
      paid: o?.paidAt ? "1" : undefined,
      deliveryMethod: o?.deliveryMethod ?? "OWN_TEAM",
      deliveredBy: o?.deliveredBy ?? null,
      deliveryNote: o?.deliveryNote ?? null,
      courier: o?.courier ?? null,
      trackingNumber: o?.trackingNumber ?? null,
      dispatched: o?.shippedAt ? "1" : undefined,
      delivered: o?.deliveredAt ? "1" : undefined,
    },
  };
}

const idOnly = z.object({ inquiryId: z.string().cuid() });

// ---------- Langkah-langkah alur yang disederhanakan ----------

const quoteSchema = z.object({
  inquiryId: z.string().cuid(),
  quotedPrice: z.coerce.number().int().min(1).max(2_000_000_000),
  quoteValidHours: z.coerce.number().int().min(1).max(168).default(site.quoteValidHours),
  followUpAt: z.string().optional().transform((v) => (v ? new Date(`${v}:00+07:00`) : null)),
});

/** Langkah 1: kirim penawaran (status menjadi Penawaran terkirim, harga dikunci sesuai jam yang dipilih). */
export async function sendQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("inquiry.update");
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Isi harga final dengan angka lebih dari 0." };
  const d = parsed.data;
  if (d.followUpAt && Number.isNaN(d.followUpAt.getTime())) return { error: "Tanggal follow-up tidak valid." };
  const cur = await db.inquiry.findUnique({ where: { id: d.inquiryId }, include: { order: { select: { paidAt: true } } } });
  if (!cur) return { error: "Inquiry tidak ditemukan." };
  const guard = checkStatusChange({ role: me.role, current: cur.status, target: "QUOTED", orderPaid: !!cur.order?.paidAt });
  if (guard) return { error: guard };
  await db.$transaction([
    db.inquiry.update({ where: { id: d.inquiryId }, data: { status: "QUOTED", quotedPrice: d.quotedPrice, quoteExpiresAt: new Date(Date.now() + d.quoteValidHours * 3600 * 1000), ...(d.followUpAt ? { followUpAt: d.followUpAt } : {}) } }),
    db.inquiryEvent.create({ data: { inquiryId: d.inquiryId, type: "status_changed", actorId: me.id, data: { from: cur.status, to: "QUOTED", price: d.quotedPrice } } }),
  ]);
  await audit(me.id, "inquiry.quote", "Inquiry", d.inquiryId, { price: d.quotedPrice });
  revalidatePath(`/admin/inquiries/${d.inquiryId}`);
  revalidatePath("/admin/inquiries");
  return { ok: true };
}

const noteSchema = z.object({
  inquiryId: z.string().cuid(),
  internalNote: z.string().trim().max(2000).optional().transform((v) => v || null),
  followUpAt: z.string().optional().transform((v) => (v ? new Date(`${v}:00+07:00`) : null)),
});

/** Catatan internal dan jadwal follow-up (tidak mengubah status). */
export async function saveNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("inquiry.update");
  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Data tidak valid." };
  const d = parsed.data;
  if (d.followUpAt && Number.isNaN(d.followUpAt.getTime())) return { error: "Tanggal follow-up tidak valid." };
  await db.inquiry.update({ where: { id: d.inquiryId }, data: { internalNote: d.internalNote, followUpAt: d.followUpAt, followUpNotifiedAt: null } });
  await audit(me.id, "inquiry.note", "Inquiry", d.inquiryId);
  revalidatePath(`/admin/inquiries/${d.inquiryId}`);
  return { ok: true };
}

const quickSchema = z.object({ inquiryId: z.string().cuid(), target: z.enum(["CONTACTED", "SUPPLIER_CHECKING", "PROCURING", "RECEIVED_BY_US", "CANCELLED"]) });

/** Tombol satu klik untuk status sederhana (Dihubungi, Cek supplier, Pesan ke supplier, Diterima QC, Batal). */
export async function quickStatus(formData: FormData): Promise<void> {
  const me = await requirePermission("inquiry.update");
  const parsed = quickSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { inquiryId, target } = parsed.data;
  const cur = await db.inquiry.findUnique({ where: { id: inquiryId }, include: { order: { select: { paidAt: true } } } });
  if (!cur) return;
  const guard = checkStatusChange({ role: me.role, current: cur.status, target, orderPaid: !!cur.order?.paidAt });
  if (guard) redirect(`/admin/inquiries/${inquiryId}?error=${encodeURIComponent(guard)}`);
  await db.$transaction([
    db.inquiry.update({ where: { id: inquiryId }, data: { status: target } }),
    db.inquiryEvent.create({ data: { inquiryId, type: "status_changed", actorId: me.id, data: { from: cur.status, to: target } } }),
  ]);
  await audit(me.id, "inquiry.status", "Inquiry", inquiryId, { from: cur.status, to: target });
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
}

const createOrderSchema = z.object({
  inquiryId: z.string().cuid(),
  itemPrice: intField(),
  shippingFee: intField(50_000_000),
  insuranceFee: intField(50_000_000).default(0),
});

/** Langkah 2: customer setuju, buat pesanan (status Menunggu bayar). Modal diambil dari modal katalog. */
export async function createOrder(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("order.write");
  const parsed = createOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Isi harga dan ongkir dengan angka." };
  const base = await loadOrderInput(parsed.data.inquiryId);
  if (!base) return { error: "Inquiry tidak ditemukan." };
  return saveOrderCore(me, { ...base.input, itemPrice: parsed.data.itemPrice, shippingFee: parsed.data.shippingFee, insuranceFee: parsed.data.insuranceFee });
}

const paySchema = z.object({
  inquiryId: z.string().cuid(),
  paymentMethod: z.enum(["BANK_TRANSFER", "VIRTUAL_ACCOUNT", "QRIS"]),
  paymentFee: intField(50_000_000).default(0),
});

/** Langkah 3: tandai lunas (mengurangi stok otomatis bila jumlah unit diketahui). */
export async function markPaid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("order.write");
  const parsed = paySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pilih metode pembayaran." };
  const base = await loadOrderInput(parsed.data.inquiryId);
  if (!base?.exists) return { error: "Buat pesanan dulu." };
  return saveOrderCore(me, { ...base.input, paymentMethod: parsed.data.paymentMethod as PaymentMethod, paymentFee: parsed.data.paymentFee, paid: "1" });
}

const shipSchema = z.object({
  inquiryId: z.string().cuid(),
  deliveryMethod: z.enum(["OWN_TEAM", "COURIER"]),
  deliveredBy: z.string().trim().max(60).optional().transform((v) => v || null),
  courier: z.string().trim().max(40).optional().transform((v) => v || null),
  trackingNumber: z.string().trim().max(60).optional().transform((v) => v || null),
  deliveryNote: z.string().trim().max(500).optional().transform((v) => v || null),
});

/** Langkah 4: tandai Dikirim (diantar tim: nama petugas; kurir: nama kurir, resi opsional). */
export async function markShipped(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requirePermission("order.fulfil");
  const parsed = shipSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Data pengiriman tidak valid." };
  const d = parsed.data;
  const base = await loadOrderInput(d.inquiryId);
  if (!base?.exists) return { error: "Pesanan belum dibuat oleh Owner." };
  return saveOrderCore(me, { ...base.input, deliveryMethod: d.deliveryMethod, deliveredBy: d.deliveredBy, courier: d.courier, trackingNumber: d.trackingNumber, deliveryNote: d.deliveryNote ?? base.input.deliveryNote, dispatched: "1" });
}

/** Langkah 5: tandai Selesai (barang sudah diterima customer). */
export async function markDelivered(formData: FormData): Promise<void> {
  const me = await requirePermission("order.fulfil");
  const parsed = idOnly.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const base = await loadOrderInput(parsed.data.inquiryId);
  if (!base?.exists) return;
  const r = await saveOrderCore(me, { ...base.input, dispatched: "1", delivered: "1" });
  if (r.error) redirect(`/admin/inquiries/${parsed.data.inquiryId}?error=${encodeURIComponent(r.error)}`);
}

const reviewSchema = z.object({
  inquiryId: z.string().cuid(),
  outcome: z.enum(["SOLD_OUT", "STILL_AVAILABLE", "SET_QTY"]),
  qty: z.coerce.number().int().min(1).max(10_000).optional(),
});

/** Peninjauan stok setelah barang terjual, untuk produk yang jumlah unitnya tidak diketahui. */
export async function reviewStockAfterSale(formData: FormData): Promise<void> {
  const me = await requirePermission("stock.review");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { inquiryId, outcome, qty } = parsed.data;
  if (outcome === "SET_QTY" && !qty) return;

  const inquiry = await db.inquiry.findUnique({ where: { id: inquiryId }, include: { order: true } });
  if (!inquiry?.order?.paidAt || inquiry.order.stockReviewedAt) return;

  await db.$transaction(async (tx) => {
    if (outcome === "SOLD_OUT") await tx.product.update({ where: { id: inquiry.productId }, data: { availability: "SOLD_OUT", stockQty: 0 } });
    if (outcome === "SET_QTY") await tx.product.update({ where: { id: inquiry.productId }, data: { stockQty: qty, availability: "VERIFIED", verifiedAt: new Date() } });
    await tx.order.update({ where: { inquiryId }, data: { stockReviewedAt: new Date() } });
    await tx.inquiryEvent.create({ data: { inquiryId, type: "stock_reviewed", actorId: me.id, data: { outcome, qty: qty ?? null } } });
  });
  await audit(me.id, "stock.review", "Product", inquiry.productId, { outcome, qty: qty ?? null });
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  revalidatePath("/admin");
  revalidatePath("/katalog");
}

const invoiceSchema = z.object({ inquiryId: z.string().cuid() });

/** Membuat link invoice publik. Hanya untuk order yang sudah lunas; link yang sudah ada dipertahankan. */
export async function issueInvoice(formData: FormData): Promise<void> {
  const me = await requirePermission("invoice.issue");
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const order = await db.order.findUnique({ where: { inquiryId: parsed.data.inquiryId }, select: { paidAt: true, invoiceToken: true } });
  if (!order?.paidAt || order.invoiceToken) return;
  await db.order.update({ where: { inquiryId: parsed.data.inquiryId }, data: { invoiceToken: newInvoiceToken(), invoiceIssuedAt: new Date() } });
  await db.inquiryEvent.create({ data: { inquiryId: parsed.data.inquiryId, type: "invoice_issued", actorId: me.id } });
  await audit(me.id, "invoice.issue", "Order", parsed.data.inquiryId);
  revalidatePath(`/admin/inquiries/${parsed.data.inquiryId}`);
}

/** Mencabut link invoice (mis. terkirim ke nomor yang salah). Link lama langsung tidak berlaku. */
export async function revokeInvoice(formData: FormData): Promise<void> {
  const me = await requirePermission("invoice.issue");
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await db.order.updateMany({ where: { inquiryId: parsed.data.inquiryId, invoiceToken: { not: null } }, data: { invoiceToken: null, invoiceIssuedAt: null } });
  await db.inquiryEvent.create({ data: { inquiryId: parsed.data.inquiryId, type: "invoice_revoked", actorId: me.id } });
  await audit(me.id, "invoice.revoke", "Order", parsed.data.inquiryId);
  revalidatePath(`/admin/inquiries/${parsed.data.inquiryId}`);
}

/** Hapus permanen inquiry (uji coba/spam): hanya Admin/Developer dan hanya bila belum ada pembayaran tercatat. */
export async function deleteInquiry(formData: FormData): Promise<void> {
  const me = await requirePermission("data.manage");
  const id = z.string().cuid().safeParse(formData.get("inquiryId"));
  if (!id.success) redirect("/admin/inquiries");
  const inquiry = await db.inquiry.findUnique({ where: { id: id.data! }, select: { code: true, status: true, order: { select: { paidAt: true } } } });
  if (!inquiry) redirect("/admin/inquiries");
  const blocked = canDeleteInquiry({ orderPaid: !!inquiry!.order?.paidAt });
  if (blocked) redirect(`/admin/inquiries/${id.data}?error=${encodeURIComponent(blocked)}`);
  await db.$transaction([db.order.deleteMany({ where: { inquiryId: id.data } }), db.inquiry.delete({ where: { id: id.data } })]); // riwayat ikut terhapus (cascade)
  await audit(me.id, "inquiry.delete", "Inquiry", id.data, { code: inquiry!.code, status: inquiry!.status });
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  redirect("/admin/inquiries");
}
