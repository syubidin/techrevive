import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, fmtDateTime, idr, requireAdmin } from "@/lib/admin";
import { deleteInquiry, issueInvoice, reviewStockAfterSale, revokeInvoice } from "../actions";
import { ConfirmButton } from "../../../confirm-button";
import { invoiceNumber } from "@/lib/invoice";
import { Icon } from "@/components/icons";
import { OrderStepper } from "@/components/order-stepper";
import { StatusBadge } from "@/components/status-badge";
import { quoteShipping, ShippingError } from "@/lib/shipping";
import { computeProfit } from "@/lib/pricing";
import { maskPhone } from "@/lib/phone";
import { customerMessage, nextStep } from "@/lib/next-step";
import { STATUS_LABEL } from "@/lib/inquiry-status";
import type { TrackStatus } from "@/lib/track";
import { site } from "@/config/site";
import { FlowPanel, NoteForm } from "./flow-panel";
import { AssigneePanel, NoteThread } from "../../assignment-panel";
import { OrderForm } from "./forms";

export const metadata = { title: "Detail inquiry" };

/** Konversi Date ke nilai <input type="datetime-local"> dalam WIB. */
const toLocalInput = (d: Date | null) => (d ? new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16) : "");

function eventText(type: string, data: unknown): string {
  const d = (data ?? {}) as { to?: string; from?: string; price?: number; outcome?: string };
  switch (type) {
    case "created": return "Inquiry masuk dari website";
    case "status_changed": return `Status: ${d.to ? STATUS_LABEL[d.to as keyof typeof STATUS_LABEL] ?? d.to : "berubah"}`;
    case "quote_set": return `Harga penawaran ${d.price ? idr(d.price) : ""}`;
    case "stock_adjusted": return "Stok disesuaikan otomatis";
    case "stock_reviewed": return "Stok ditinjau";
    case "invoice_issued": return "Invoice dibuat";
    case "invoice_revoked": return "Link invoice dicabut";
    case "note": return "Catatan tim ditambahkan";
    case "assigned": return "Penanggung jawab diubah";
    default: return type.replace(/_/g, " ");
  }
}

export default async function InquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const inquiry = await db.inquiry.findUnique({
    where: { id },
    include: { order: true, assignee: { select: { id: true, name: true } }, events: { orderBy: { createdAt: "desc" }, take: 30, where: { type: { not: "note" } } }, product: { select: { id: true, slug: true, sku: true, costPrice: true, weightGram: true, nameId: true, stockQty: true, availability: true } } },
  });
  if (!inquiry) notFound();
  const manageOthers = can(me.role, "inquiry.assignOthers");
  const [noteRows, staff] = await Promise.all([
    db.inquiryEvent.findMany({ where: { inquiryId: id, type: "note" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, data: true, actorId: true, createdAt: true } }),
    manageOthers ? db.adminUser.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true } }) : Promise.resolve(null),
  ]);
  const authorIds = [...new Set(noteRows.map((n) => n.actorId).filter((v): v is string => !!v))];
  const authors = authorIds.length ? new Map((await db.adminUser.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name])) : new Map<string, string>();
  const notes = noteRows.map((n) => ({ id: n.id, text: String((n.data as { text?: string } | null)?.text ?? ""), author: (n.actorId && authors.get(n.actorId)) || "Petugas", at: fmtDateTime(n.createdAt) }));

  const money = can(me.role, "order.write");
  const cost = can(me.role, "finance.view");
  const seePhone = can(me.role, "pii.view");
  const fulfil = can(me.role, "order.fulfil");
  const override = can(me.role, "inquiry.override");
  const o = inquiry.order;
  const snap = inquiry.productSnapshot as { name?: string; price?: number };
  const step = nextStep({ status: inquiry.status, hasOrder: !!o });
  const needsStockReview = !!o?.paidAt && !o.stockReviewedAt && !o.stockAutoApplied && can(me.role, "stock.review");
  const basePrice = o?.itemPrice ?? inquiry.quotedPrice ?? snap.price ?? 0;

  let shippingHint = "Area belum dipilih customer; isi manual.";
  let suggested = 0, suggestedIns = 0;
  if (money && inquiry.area) {
    const rates = await db.shippingRate.findMany({ where: { isActive: true } });
    try {
      const q = quoteShipping(rates, { city: inquiry.area, actualWeightGram: inquiry.product.weightGram, declaredValue: basePrice });
      suggested = q.shippingFee; suggestedIns = q.insuranceFee;
      shippingHint = `Saran sistem: ${idr(q.shippingFee)} (${q.zone}, ${q.chargeableKg} kg, ${q.minDays}–${q.maxDays} hari).`;
    } catch (e) {
      shippingHint = e instanceof ShippingError && e.code === "OUT_OF_AREA" ? "Area di luar Jabodetabek atau zona belum diatur. Isi manual." : "Tidak bisa menghitung ongkir.";
    }
  }

  const site_ = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const lang = inquiry.locale === "en" ? "en" : "id";
  const msg = customerMessage(inquiry.status, {
    name: inquiry.customerName,
    code: inquiry.code,
    product: snap.name ?? "produk",
    price: (o?.total ?? inquiry.quotedPrice) ? idr((o?.total ?? inquiry.quotedPrice)!) : null,
    validUntil: inquiry.quoteExpiresAt ? `${fmtDateTime(inquiry.quoteExpiresAt)} WIB` : null,
    trackUrl: `${site_}/${lang}/track`,
    courier: o?.courier ?? null,
    trackingNumber: o?.trackingNumber ?? null,
    deliveredBy: o?.deliveredBy ?? null,
  });
  const waLink = `https://wa.me/${inquiry.phone}?text=${encodeURIComponent(msg)}`;

  const canInvoice = can(me.role, "invoice.issue") && !!o;
  const invoiceUrl = o?.invoiceToken ? `${site_}/${lang}/invoice/${o.invoiceToken}` : null;
  const invoiceWa = invoiceUrl ? `https://wa.me/${inquiry.phone}?text=${encodeURIComponent(`Halo ${inquiry.customerName}, terima kasih sudah berbelanja di TechRevive. Berikut bukti pembelian ${invoiceNumber(inquiry.code)}:\n${invoiceUrl}`)}` : null;
  const profit = cost && o ? computeProfit(o.itemPrice, o.itemCost, o.paymentFee) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inquiries" className="muted inline-flex min-h-11 items-center gap-1 text-sm hover:underline"><Icon name="arrow-left" size={16} />Inquiry</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-extrabold tracking-tight">{inquiry.code}</h1>
          <StatusBadge status={inquiry.status} />
        </div>
        <p className="muted mt-1 text-sm">{snap.name} · {inquiry.customerName}</p>
      </div>

      <div className="card p-4 sm:p-5"><OrderStepper status={inquiry.status as TrackStatus} /></div>

      {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><Icon name="alert" size={18} className="mt-0.5 shrink-0" />{error.slice(0, 250)}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-6">
          <FlowPanel
            id={inquiry.id}
            step={step}
            status={inquiry.status}
            canMoney={money}
            canFulfil={fulfil}
            canOverride={override}
            d={{
              quotedPrice: inquiry.quotedPrice ?? snap.price ?? 0,
              validHours: site.quoteValidHours,
              itemPrice: basePrice,
              shippingFee: o?.shippingFee ?? suggested,
              insuranceFee: o?.insuranceFee ?? suggestedIns,
              shippingHint,
              total: o?.total ?? null,
              paymentMethod: o?.paymentMethod ?? "",
              paymentFee: o?.paymentFee ?? 0,
              deliveryMethod: o?.deliveryMethod ?? "OWN_TEAM",
              deliveredBy: o?.deliveredBy ?? "",
              courier: o?.courier ?? "",
              trackingNumber: o?.trackingNumber ?? "",
              deliveryNote: o?.deliveryNote ?? "",
            }}
          />

          {needsStockReview && (
            <section className="card space-y-3 p-5 text-sm">
              <h2 className="font-bold">Tinjau stok setelah terjual</h2>
              <p className="muted">Jumlah unit &ldquo;{snap.name}&rdquo; tidak tercatat. Apakah masih ada unit lain dari supplier?</p>
              <div className="flex flex-wrap items-end gap-2">
                <form action={reviewStockAfterSale}><input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="SOLD_OUT" /><button className="btn btn-primary">Tandai Habis</button></form>
                <form action={reviewStockAfterSale} className="flex items-end gap-2">
                  <input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="SET_QTY" />
                  <div><label className="label" htmlFor="qty">Masih ada (unit)</label><input id="qty" name="qty" type="number" min={1} max={10000} required className="input w-28" /></div>
                  <button className="btn btn-ghost">Simpan sisa</button>
                </form>
                <form action={reviewStockAfterSale}><input type="hidden" name="inquiryId" value={inquiry.id} /><input type="hidden" name="outcome" value="STILL_AVAILABLE" /><button className="btn btn-ghost">Masih ada, jumlah tidak tahu</button></form>
              </div>
            </section>
          )}

          {profit && <p className="card flex gap-2 p-4 text-sm"><Icon name="chart" size={18} className="mt-0.5 shrink-0" /><span>Laba order ini: <b>{idr(profit.profit)}</b> ({(profit.marginBps / 100).toFixed(2)}%). Total tagihan customer: <b>{idr(o!.total)}</b>.</span></p>}

          <NoteThread entity="inquiry" id={inquiry.id} notes={notes} />

          <NoteForm id={inquiry.id} note={inquiry.internalNote ?? ""} followUpAt={toLocalInput(inquiry.followUpAt)} />

          {money && o && (
            <details className="card p-5">
              <summary className="cursor-pointer font-bold">Koreksi order (lanjutan)</summary>
              <p className="muted mt-2 text-sm">Untuk memperbaiki angka atau membatalkan tanda lunas/dikirim. Penggunaan harian cukup lewat panel &ldquo;Langkah berikutnya&rdquo; di atas.</p>
              <div className="mt-4">
                <OrderForm
                  inquiryId={inquiry.id}
                  itemPrice={o.itemPrice}
                  itemCost={o.itemCost}
                  shippingFee={o.shippingFee}
                  insuranceFee={o.insuranceFee}
                  paymentFee={o.paymentFee}
                  paymentMethod={o.paymentMethod ?? ""}
                  paid={!!o.paidAt}
                  deliveryMethod={o.deliveryMethod}
                  deliveredBy={o.deliveredBy ?? ""}
                  deliveryNote={o.deliveryNote ?? ""}
                  courier={o.courier ?? ""}
                  trackingNumber={o.trackingNumber ?? ""}
                  dispatched={!!o.shippedAt}
                  delivered={!!o.deliveredAt}
                  shippingHint={shippingHint}
                />
              </div>
            </details>
          )}
        </div>

        <aside className="space-y-6">
          <AssigneePanel entity="inquiry" id={inquiry.id} assignee={inquiry.assignee} meId={me.id} users={staff} />

          <section className="card space-y-2 p-5 text-sm">
            <h2 className="font-bold">Customer</h2>
            <p>{inquiry.customerName}</p>
            <p className="muted">{seePhone ? inquiry.phone : maskPhone(inquiry.phone)} · {inquiry.area ?? "area ?"}</p>
            {inquiry.variantNote && <p className="muted">Catatan: {inquiry.variantNote}</p>}
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-2 w-full"><Icon name="message-circle" size={18} />Kabari via WhatsApp</a>
            <p className="muted text-xs">Pesan sudah terisi sesuai status saat ini, lengkap dengan link Lacak Pesanan.</p>
          </section>

          {canInvoice && (
            <section className="card space-y-3 p-5 text-sm">
              <h2 className="font-bold">Invoice</h2>
              {invoiceUrl ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><Icon name="receipt" size={16} />Buka / cetak</a>
                    <a href={invoiceWa!} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm"><Icon name="message-circle" size={16} />Kirim</a>
                  </div>
                  {money && <form action={revokeInvoice}><input type="hidden" name="inquiryId" value={inquiry.id} /><button className="muted text-xs underline">Cabut link invoice</button></form>}
                </>
              ) : (
                <>
                  <p className="muted">Buat link invoice untuk customer (hanya harga jual, tanpa modal dan laba). Status Lunas/Belum lunas ikut otomatis.</p>
                  <form action={issueInvoice}><input type="hidden" name="inquiryId" value={inquiry.id} /><button className="btn btn-primary btn-sm">Buat invoice</button></form>
                </>
              )}
            </section>
          )}

          <section className="card space-y-1 p-5 text-sm">
            <h2 className="font-bold">Produk</h2>
            <p>{snap.name}</p>
            <p className="muted">{inquiry.product.sku} · harga saat inquiry {idr(snap.price ?? 0)}</p>
            {cost && <p className="muted">Modal katalog: {idr(inquiry.product.costPrice)}</p>}
          </section>

          <details className="card p-5 text-sm">
            <summary className="cursor-pointer font-bold">Riwayat ({inquiry.events.length})</summary>
            <ul className="mt-3 space-y-3">
              {inquiry.events.map((e) => (
                <li key={e.id}><p className="font-medium">{eventText(e.type, e.data)}</p><p className="muted text-xs">{fmtDateTime(e.createdAt)}</p></li>
              ))}
            </ul>
          </details>

          {can(me.role, "data.manage") && !o?.paidAt && (
            <details className="card p-5 text-sm">
              <summary className="cursor-pointer font-bold text-[var(--color-danger-600)]">Zona berbahaya</summary>
              <p className="muted mt-2">Hapus permanen inquiry ini (data uji coba atau spam). Tidak tersedia setelah pembayaran tercatat.</p>
              <form action={deleteInquiry} className="mt-2"><input type="hidden" name="inquiryId" value={inquiry.id} /><ConfirmButton message={`Hapus permanen inquiry ${inquiry.code}? Tidak bisa dibatalkan.`}>Hapus inquiry</ConfirmButton></form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
