import { db } from "./db";
import type { ReportOrder } from "./reports";

/** Order lunas dalam rentang [from,to) yang tidak dibatalkan. Hanya dipanggil dari kode dengan izin report.view. */
export async function fetchReportOrders(from: Date, to: Date): Promise<ReportOrder[]> {
  const rows = await db.order.findMany({
    where: { paidAt: { gte: from, lt: to }, inquiry: { status: { not: "CANCELLED" } } },
    orderBy: { paidAt: "asc" },
    take: 5000,
    select: {
      paidAt: true, itemPrice: true, itemCost: true, shippingFee: true, insuranceFee: true, paymentFee: true, total: true, paymentMethod: true,
      inquiry: { select: { code: true, productSnapshot: true, product: { select: { sku: true, nameId: true, category: { select: { nameId: true } } } } } },
    },
  });
  return rows.map((r) => ({
    code: r.inquiry.code, productName: r.inquiry.product.nameId, sku: r.inquiry.product.sku, category: r.inquiry.product.category.nameId,
    paidAt: r.paidAt!, itemPrice: r.itemPrice, itemCost: r.itemCost, shippingFee: r.shippingFee, insuranceFee: r.insuranceFee, paymentFee: r.paymentFee, total: r.total, paymentMethod: r.paymentMethod,
  }));
}
