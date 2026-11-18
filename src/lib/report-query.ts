import { db } from "./db";
import type { ReportOrder } from "./reports";

const BATCH = 1000;
const HARD_CAP = 100_000; // pengaman memori; rentang maksimal 1 tahun jauh di bawah ini

/**
 * Order lunas dalam rentang [from,to) yang tidak dibatalkan. Hanya dipanggil dari kode dengan izin report.view.
 * Dibaca bertahap (cursor) agar laporan tidak pernah terpotong diam-diam dan memori tetap terkendali.
 */
export async function fetchReportOrders(from: Date, to: Date): Promise<ReportOrder[]> {
  const out: ReportOrder[] = [];
  let cursor: string | undefined;
  while (out.length < HARD_CAP) {
    const rows = await db.order.findMany({
      where: { paidAt: { gte: from, lt: to }, inquiry: { status: { not: "CANCELLED" } } },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, paidAt: true, itemPrice: true, itemCost: true, shippingFee: true, insuranceFee: true, paymentFee: true, total: true, paymentMethod: true,
        inquiry: { select: { code: true, product: { select: { sku: true, nameId: true, category: { select: { nameId: true } } } } } },
      },
    });
    for (const r of rows) {
      out.push({
        code: r.inquiry.code, productName: r.inquiry.product.nameId, sku: r.inquiry.product.sku, category: r.inquiry.product.category.nameId,
        paidAt: r.paidAt!, itemPrice: r.itemPrice, itemCost: r.itemCost, shippingFee: r.shippingFee, insuranceFee: r.insuranceFee, paymentFee: r.paymentFee, total: r.total, paymentMethod: r.paymentMethod,
      });
    }
    if (rows.length < BATCH) break;
    cursor = rows[rows.length - 1]!.id;
  }
  return out;
}
