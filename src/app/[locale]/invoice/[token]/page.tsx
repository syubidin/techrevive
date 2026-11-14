import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, site } from "@/config/site";
import { db } from "@/lib/db";
import { formatDate, formatIdr, pick } from "@/lib/i18n";
import { invoiceLines, invoiceNumber, isInvoiceToken } from "@/lib/invoice";
import { maskPhone } from "@/lib/phone";
import { PrintButton } from "@/app/admin/(panel)/reports/print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice", robots: { index: false, follow: false } };

const METHOD = {
  BANK_TRANSFER: { id: "Transfer bank", en: "Bank transfer" },
  VIRTUAL_ACCOUNT: { id: "Virtual account", en: "Virtual account" },
  QRIS: { id: "QRIS", en: "QRIS" },
} as const;

export default async function InvoicePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  if (!isLocale(locale) || !isInvoiceToken(token)) notFound();

  // Hanya kolom yang aman ditampilkan ke customer (tanpa modal/laba/catatan internal).
  const order = await db.order.findUnique({
    where: { invoiceToken: token },
    select: {
      itemPrice: true, shippingFee: true, insuranceFee: true, paymentMethod: true, paidAt: true, deliveryMethod: true, courier: true, trackingNumber: true, invoiceIssuedAt: true,
      inquiry: { select: { code: true, customerName: true, phone: true, status: true, productSnapshot: true, product: { select: { sku: true, nameId: true, nameEn: true, grade: true } } } },
    },
  });
  if (!order || !order.paidAt || order.inquiry.status === "CANCELLED") notFound();

  const L = (id: string, en: string) => pick(locale, id, en);
  const { lines, total } = invoiceLines(order, { item: L("Barang", "Item"), shipping: L("Ongkos kirim / antar", "Delivery fee"), insurance: L("Asuransi", "Insurance") });
  const productName = pick(locale, order.inquiry.product.nameId, order.inquiry.product.nameEn);
  const method = order.paymentMethod ? pick(locale, METHOD[order.paymentMethod].id, METHOD[order.paymentMethod].en) : "-";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <article className="card space-y-6 p-6 sm:p-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-lg" />
            <div><p className="text-lg font-extrabold">{site.name}</p><p className="muted text-xs">{L("Bukti pembelian", "Proof of purchase")}</p></div>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold">{invoiceNumber(order.inquiry.code)}</p>
            <p className="muted text-xs">{formatDate(order.invoiceIssuedAt ?? order.paidAt, locale)}</p>
            <span className="chip mt-1">{L("LUNAS", "PAID")}</span>
          </div>
        </header>

        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div><p className="muted text-xs font-semibold uppercase">{L("Pembeli", "Customer")}</p><p className="font-semibold">{order.inquiry.customerName}</p><p className="muted">{maskPhone(order.inquiry.phone)}</p></div>
          <div><p className="muted text-xs font-semibold uppercase">{L("Pembayaran", "Payment")}</p><p>{method}</p><p className="muted">{formatDate(order.paidAt, locale)}</p></div>
        </section>

        <section>
          <p className="muted text-xs font-semibold uppercase">{L("Produk", "Product")}</p>
          <p className="mt-1 font-semibold">{productName}</p>
          <p className="muted text-xs">SKU {order.inquiry.product.sku}{order.inquiry.product.grade ? ` · Grade ${order.inquiry.product.grade}` : ""}</p>
        </section>

        <table className="w-full text-sm">
          <tbody>
            {lines.map((l) => <tr key={l.label} className="border-t border-[var(--line)]"><td className="py-2">{l.label}</td><td className="text-right">{formatIdr(l.amount)}</td></tr>)}
            <tr className="border-t-2 border-[var(--line)] font-extrabold"><td className="py-3">Total</td><td className="text-right">{formatIdr(total)}</td></tr>
          </tbody>
        </table>

        <section className="text-sm">
          <p className="muted text-xs font-semibold uppercase">{L("Pengiriman", "Delivery")}</p>
          <p>{order.deliveryMethod === "OWN_TEAM" ? L("Diantar oleh tim TechRevive", "Delivered by the TechRevive team") : `${L("Kurir", "Courier")}: ${order.courier ?? "-"}${order.trackingNumber ? ` · ${L("Resi", "Tracking")} ${order.trackingNumber}` : ""}`}</p>
        </section>

        <p className="muted border-t border-[var(--line)] pt-4 text-xs leading-relaxed">
          {L("Barang second/refurbished dijual sesuai kondisi dan grade yang tertera, tanpa garansi dan tanpa retur. Simpan invoice ini sebagai bukti pembelian.", "Second-hand/refurbished item sold as described by its condition and grade, without warranty or returns. Keep this invoice as your proof of purchase.")}
        </p>
      </article>
      <div className="no-print mt-4 flex justify-center"><PrintButton label={L("Cetak / Simpan PDF", "Print / Save as PDF")} /></div>
    </div>
  );
}
