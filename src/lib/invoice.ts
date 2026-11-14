import { randomBytes } from "node:crypto";

/** Token link invoice: 24 byte acak (192 bit) base64url = 32 karakter. */
export const newInvoiceToken = () => randomBytes(24).toString("base64url");
export const isInvoiceToken = (v: string) => /^[A-Za-z0-9_-]{32}$/.test(v);
export const invoiceNumber = (inquiryCode: string) => `INV-${inquiryCode.replace(/^TR-/, "")}`;

export interface InvoiceLine { label: string; amount: number }

/** Rincian tagihan; baris Rp0 (asuransi/ongkir) disembunyikan, total dihitung ulang dan harus cocok dengan order. */
export function invoiceLines(o: { itemPrice: number; shippingFee: number; insuranceFee: number }, labels: { item: string; shipping: string; insurance: string }): { lines: InvoiceLine[]; total: number } {
  const lines: InvoiceLine[] = [{ label: labels.item, amount: o.itemPrice }];
  if (o.shippingFee > 0) lines.push({ label: labels.shipping, amount: o.shippingFee });
  if (o.insuranceFee > 0) lines.push({ label: labels.insurance, amount: o.insuranceFee });
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}
