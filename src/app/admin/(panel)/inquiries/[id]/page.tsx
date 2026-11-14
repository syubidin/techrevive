import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, fmtDateTime, idr, requireAdmin } from "@/lib/admin";
import { allowedTargets } from "@/lib/status-guard";
import { issueInvoice, reviewStockAfterSale, revokeInvoice } from "../actions";
import { invoiceNumber } from "@/lib/invoice";
import { STATUS_LABEL } from "@/lib/inquiry-status";
import { quoteShipping, ShippingError } from "@/lib/shipping";
import { computeProfit } from "@/lib/pricing";
import { maskPhone } from "@/lib/phone";
import { site } from "@/config/site";
import { OrderForm, UpdateForm } from "./forms";

export const metadata = { title: "Detail inquiry" };

/** Konversi Date ke nilai <input type="datetime-local"> dalam WIB. */
const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : "");

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const inquiry = await db.inquiry.findUnique({
    where: { id },
    include: { order: true, events: { orderBy: { createdAt: "desc" }, take: 50 }, product: { select: { id: true, slug: true, sku: true, costPrice: true, weightGram: true, nameId: true, stockQty: true, availability: true } } },
  });
  if (!inquiry) notFound();

  const cost = can(me.role, "finance.view");
  const seePhone = can(me.role, "pii.view");
  const allowedStatuses = allowedTargets({ role: me.role, current: inquiry.status, orderPaid: !!inquiry.order?.paidAt });
  const needsStockReview = !!inquiry.order?.paidAt && !inquiry.order.stockReviewedAt && !inquiry.order.stockAutoApplied && can(me.role, "stock.review");
  const snap = inquiry.productSnapshot as { name?: string; price?: number };
  const basePrice = inquiry.order?.itemPrice ?? inquiry.quotedPrice ?? snap.price ?? 0;

  let shippingHint = "Area belum dipilih customer; isi manual.";
  let suggested = 0, suggestedIns = 0;
  if (cost && inquiry.area) {
    const rates = await db.shippingRate.findMany({ where: { isActive: true } });
    try {
      const q = quoteShipping(rates, { city: inquiry.area, actualWeightGram: inquiry.product.weightGram, declaredValue: basePrice });
      suggested = q.shippingFee; suggestedIns = q.insuranceFee;
      shippingHint = `Saran sistem: ${idr(q.shippingFee)} (${q.zone}, ${q.chargeableKg} kg, ${q.minDays}–${q.maxDays} hari). Asuransi: ${idr(q.insuranceFee)}.`;
    } catch (e) {
      shippingHint = e instanceof ShippingError && e.code === "OUT_OF_AREA" ? "Area di luar Jabodetabek atau zona belum diatur. Isi manual." : "Tidak bisa menghitung ongkir.";
    }
  }

  const quoteMsg = [
    `Halo ${inquiry.customerName}, terima kasih telah menghubungi TechRevive (kode ${inquiry.code}).`,
    `Produk: ${snap.name}`,
    inquiry.quotedPrice ? `Harga final: ${idr(inquiry.quotedPrice)}${inquiry.quoteExpiresAt ? ` (berlaku s.d. ${fmtDateTime(inquiry.quoteExpiresAt)} WIB)` : ""}` : "Kami sedang mengecek ketersediaan unit.",
    "Catatan: barang dijual tanpa garansi dan retur; kondisi sesuai grade yang tertera.",
  ].join("\n");
  const canInvoice = can(me.role, "invoice.issue") && !!inquiry.order?.paidAt;
  const invoiceUrl = inquiry.order?.invoiceToken ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/${inquiry.locale === "en" ? "en" : "id"}/invoice/${inquiry.order.invoiceToken}` : null;
  const invoiceMsg = invoiceUrl ? `Halo ${inquiry.customerName}, terima kasih sudah berbelanja di TechRevive. Berikut bukti pembelian ${invoiceNumber(inquiry.code)}:\n${invoiceUrl}` : "";
  const invoiceWa = invoiceUrl ? `https://wa.me/${inquiry.phone}?text=${encodeURIComponent(invoiceMsg)}` : null;
  const waLink = `https://wa.me/${inquiry.phone}?text=${encodeURIComponent(quoteMsg)}`;
  const profit = cost && inquiry.order ? computeProfit(inquiry.order.itemPrice, inquiry.order.itemCost, inquiry.order.paymentFee) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inquiries" className="muted text-sm underline">← Inquiry</Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight"><span className="font-mono">{inquiry.code}</span><span className="chip">{STATUS_LABEL[inquiry.status]}</span></h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <UpdateForm
            allowedStatuses={allowedStatuses}
            id={inquiry.id}
            updatedAt={inquiry.updatedAt.toISOString()}
            status={inquiry.status}
            quotedPrice={inquiry.quotedPrice}
            internalNote={inquiry.internalNote}
            followUpAt={toLocalInput(inquiry.followUpAt)}
            validHours={site.quoteValidHours}
          />
          {needsStockReview && (
            <section className="card space-y-3 border-[var(--color-brand-500)] p-5 text-sm">
              <h2 className="font-bold">Tinjau stok setelah terjual</h2>
              <p className="muted">Jumlah unit &ldquo;{snap.name}&rdquo; tidak tercatat. Apakah masih ada unit lain dari supplier?</p>
              <div className="flex flex-wrap items-end gap-2">
                <form action={reviewStockAfterSale}><input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="SOLD_OUT" /><button className="btn btn-primary">Tandai Habis</button></form>
                <form action={reviewStockAfterSale} className="flex items-end gap-2">
                  <input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="SET_QTY" />
                  <div><label className="label" htmlFor="qty">Masih ada (unit)</label><input id="qty" name="qty" type="number" min={1} max={10000} required className="input w-28" /></div>
                  <button className="btn">Simpan sisa</button>
                </form>
                <form action={reviewStockAfterSale}><input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="STILL_AVAILABLE" /><button className="btn">Masih ada, jumlah tidak tahu</button></form>
              </div>
            </section>
          )}
          {cost && (
            <OrderForm
              inquiryId={inquiry.id}
              itemPrice={basePrice}
              itemCost={inquiry.order?.itemCost ?? inquiry.product.costPrice}
              shippingFee={inquiry.order?.shippingFee ?? suggested}
              insuranceFee={inquiry.order?.insuranceFee ?? suggestedIns}
              paymentFee={inquiry.order?.paymentFee ?? 0}
              paymentMethod={inquiry.order?.paymentMethod ?? ""}
              paid={!!inquiry.order?.paidAt}
              deliveryMethod={inquiry.order?.deliveryMethod ?? "OWN_TEAM"}
              deliveredBy={inquiry.order?.deliveredBy ?? ""}
              deliveryNote={inquiry.order?.deliveryNote ?? ""}
              courier={inquiry.order?.courier ?? ""}
              trackingNumber={inquiry.order?.trackingNumber ?? ""}
              dispatched={!!inquiry.order?.shippedAt}
              delivered={!!inquiry.order?.deliveredAt}
              shippingHint={shippingHint}
            />
          )}
          {profit && <p className="card p-4 text-sm">Laba order ini: <b>{idr(profit.profit)}</b> ({(profit.marginBps / 100).toFixed(2)}% dari harga jual). Total tagihan customer: <b>{idr(inquiry.order!.total)}</b>.</p>}
        </div>

        <aside className="space-y-6">
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p>{inquiry.customerName}</p>
            <p className="muted">{seePhone ? inquiry.phone : maskPhone(inquiry.phone)} · {inquiry.area ?? "area ?"}</p>
            {inquiry.variantNote && <p className="muted">Catatan: {inquiry.variantNote}</p>}
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-2 w-full">Balas via WhatsApp</a>
          </section>
          {canInvoice && (
            <section className="card space-y-3 p-5 text-sm">
              <h2 className="font-bold">Invoice / bukti pembelian</h2>
              {invoiceUrl ? (
                <>
                  <p className="muted break-all text-xs">{invoiceUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn">Buka / cetak</a>
                    <a href={invoiceWa!} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Kirim via WhatsApp</a>
                  </div>
                  <form action={revokeInvoice}><input type="hidden" name="inquiryId" value={inquiry.id} /><button className="muted text-xs underline">Cabut link invoice</button></form>
                </>
              ) : (
                <>
                  <p className="muted">Buat link invoice untuk dikirim ke customer. Hanya memuat harga jual, ongkir, dan status lunas (tanpa modal/laba).</p>
                  <form action={issueInvoice}><input type="hidden" name="inquiryId" value={inquiry.id} /><button className="btn btn-primary">Buat invoice</button></form>
                </>
              )}
            </section>
          )}
          <section className="card space-y-1 p-5 text-sm">
            <h2 className="font-bold">Produk</h2>
            <p>{snap.name}</p>
            <p className="muted">{inquiry.product.sku} · harga saat inquiry {idr(snap.price ?? 0)}</p>
            {cost && <p className="muted">Modal katalog: {idr(inquiry.product.costPrice)}</p>}
            <Link href={`/admin/products`} className="text-xs underline">Kelola produk</Link>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="font-bold">Riwayat</h2>
            <ul className="mt-3 space-y-3">
              {inquiry.events.map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{e.type.replace(/_/g, " ")}</p>
                  <p className="muted text-xs">{fmtDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
