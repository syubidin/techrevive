/** Agregasi laporan penjualan (fungsi murni). Penjualan dihitung dari tanggal LUNAS, zona WIB. */
export interface ReportOrder {
  code: string; productName: string; sku: string; category: string;
  paidAt: Date; itemPrice: number; itemCost: number; shippingFee: number; insuranceFee: number; paymentFee: number; total: number;
  paymentMethod: string | null;
}

export interface Totals { orders: number; revenue: number; cost: number; paymentFees: number; profit: number; marginBps: number; shippingCollected: number; avgOrder: number }
export interface Report {
  totals: Totals;
  byDay: Array<{ day: string } & Pick<Totals, "orders" | "revenue" | "profit">>;
  byProduct: Array<{ name: string; sku: string; orders: number; revenue: number; profit: number }>;
  byCategory: Array<{ name: string; orders: number; revenue: number; profit: number }>;
  byPayment: Array<{ method: string; orders: number; revenue: number }>;
}

const WIB = 7 * 3600 * 1000;
export const wibDay = (d: Date) => new Date(d.getTime() + WIB).toISOString().slice(0, 10);
export const orderProfit = (o: Pick<ReportOrder, "itemPrice" | "itemCost" | "paymentFee">) => o.itemPrice - o.itemCost - o.paymentFee;

/** Rentang tanggal WIB inklusif "YYYY-MM-DD" → [from, to) dalam UTC. Null bila tidak valid. */
export function parseRange(from: string | undefined, to: string | undefined): { from: Date; to: Date } | null {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !re.test(from) || !re.test(to)) return null;
  const f = new Date(`${from}T00:00:00+07:00`), t = new Date(`${to}T00:00:00+07:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t < f) return null;
  if (wibDay(f) !== from || wibDay(t) !== to) return null; // tanggal mustahil (mis. 2026-02-31)
  const end = new Date(t.getTime() + 24 * 3600 * 1000);
  if (end.getTime() - f.getTime() > 366 * 24 * 3600 * 1000) return null;
  return { from: f, to: end };
}

export function defaultRange(now = new Date()): { from: string; to: string } {
  const today = wibDay(now);
  return { from: `${today.slice(0, 8)}01`, to: today };
}

const bucket = <K extends string, V extends { orders: number; revenue: number; profit: number }>(map: Map<K, V>, key: K, init: () => V, o: ReportOrder) => {
  const row = map.get(key) ?? init();
  row.orders += 1; row.revenue += o.itemPrice; row.profit += orderProfit(o);
  map.set(key, row);
};

export function buildReport(orders: ReportOrder[]): Report {
  let revenue = 0, cost = 0, fees = 0, ship = 0;
  const days = new Map<string, { day: string; orders: number; revenue: number; profit: number }>();
  const prods = new Map<string, { name: string; sku: string; orders: number; revenue: number; profit: number }>();
  const cats = new Map<string, { name: string; orders: number; revenue: number; profit: number }>();
  const pays = new Map<string, { method: string; orders: number; revenue: number }>();
  for (const o of orders) {
    revenue += o.itemPrice; cost += o.itemCost; fees += o.paymentFee; ship += o.shippingFee + o.insuranceFee;
    const day = wibDay(o.paidAt);
    bucket(days, day, () => ({ day, orders: 0, revenue: 0, profit: 0 }), o);
    bucket(prods, o.sku, () => ({ name: o.productName, sku: o.sku, orders: 0, revenue: 0, profit: 0 }), o);
    bucket(cats, o.category, () => ({ name: o.category, orders: 0, revenue: 0, profit: 0 }), o);
    const m = o.paymentMethod ?? "UNKNOWN";
    const p = pays.get(m) ?? { method: m, orders: 0, revenue: 0 };
    p.orders += 1; p.revenue += o.itemPrice; pays.set(m, p);
  }
  const profit = revenue - cost - fees;
  const byRevenue = <T extends { revenue: number }>(a: T[]) => a.sort((x, y) => y.revenue - x.revenue);
  return {
    totals: { orders: orders.length, revenue, cost, paymentFees: fees, profit, marginBps: revenue ? Math.round((profit / revenue) * 10000) : 0, shippingCollected: ship, avgOrder: orders.length ? Math.round(revenue / orders.length) : 0 },
    byDay: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    byProduct: byRevenue([...prods.values()]),
    byCategory: byRevenue([...cats.values()]),
    byPayment: byRevenue([...pays.values()]),
  };
}

/** Sel CSV aman: kutip, dan netralkan awalan rumus (=,+,-,@) agar tidak dieksekusi Excel. */
export function csvCell(v: string | number | null): string {
  let s = v === null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ordersToCsv(orders: ReportOrder[]): string {
  const head = ["Kode", "Tanggal lunas (WIB)", "Produk", "SKU", "Kategori", "Metode bayar", "Harga jual", "Modal", "Biaya bayar", "Laba", "Ongkir+asuransi", "Total tagihan"];
  const rows = orders.map((o) => [o.code, wibDay(o.paidAt), o.productName, o.sku, o.category, o.paymentMethod ?? "", o.itemPrice, o.itemCost, o.paymentFee, orderProfit(o), o.shippingFee + o.insuranceFee, o.total]);
  return "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
