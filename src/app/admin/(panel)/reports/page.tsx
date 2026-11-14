import { idr, requirePermission, fmtDateTime } from "@/lib/admin";
import { fetchReportOrders } from "@/lib/report-query";
import { buildReport, defaultRange, parseRange } from "@/lib/reports";
import { PrintButton } from "./print-button";

export const metadata = { title: "Laporan penjualan" };

const METHOD: Record<string, string> = { BANK_TRANSFER: "Transfer bank", VIRTUAL_ACCOUNT: "Virtual account", QRIS: "QRIS", UNKNOWN: "Tidak dicatat" };
const pct = (bps: number) => `${(bps / 100).toFixed(1)}%`;

export default async function Reports({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requirePermission("report.view");
  const sp = await searchParams;
  const def = defaultRange();
  const from = sp.from ?? def.from, to = sp.to ?? def.to;
  const range = parseRange(from, to);
  const report = range ? buildReport(await fetchReportOrders(range.from, range.to)) : null;
  const t = report?.totals;
  const maxDay = Math.max(1, ...(report?.byDay.map((d) => d.revenue) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Laporan penjualan</h1>
        {report && <div className="no-print flex gap-2"><a className="btn" href={`/api/admin/reports/csv?from=${from}&to=${to}`}>Unduh CSV</a><PrintButton /></div>}
      </div>

      <form className="card no-print flex flex-wrap items-end gap-3 p-4" method="get">
        <div><label className="label" htmlFor="from">Dari</label><input id="from" name="from" type="date" className="input" defaultValue={from} required /></div>
        <div><label className="label" htmlFor="to">Sampai</label><input id="to" name="to" type="date" className="input" defaultValue={to} required /></div>
        <button className="btn btn-primary">Tampilkan</button>
      </form>

      {!report || !t ? (
        <p role="alert" className="card p-4 text-sm text-[var(--color-danger-600)]">Rentang tanggal tidak valid (maksimal 1 tahun, tanggal akhir tidak boleh sebelum awal).</p>
      ) : (
        <>
          <p className="muted text-sm">Periode {from} s.d. {to} (WIB), berdasarkan tanggal pembayaran lunas; order batal tidak dihitung. Dicetak {fmtDateTime(new Date())} WIB.</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Order lunas", String(t.orders)], ["Omzet barang", idr(t.revenue)], ["Modal", idr(t.cost)], ["Biaya pembayaran", idr(t.paymentFees)],
              ["Laba kotor", idr(t.profit)], ["Margin", pct(t.marginBps)], ["Rata-rata order", idr(t.avgOrder)], ["Ongkir + asuransi diterima", idr(t.shippingCollected)],
            ].map(([k, v]) => <div key={k} className="card p-4"><p className="muted text-xs font-semibold uppercase tracking-wide">{k}</p><p className="mt-1 text-xl font-extrabold">{v}</p></div>)}
          </div>

          <section className="card p-5">
            <h2 className="font-bold">Omzet harian</h2>
            {report.byDay.length === 0 ? <p className="muted mt-3 text-sm">Belum ada penjualan pada periode ini.</p> : (
              <table className="mt-3 w-full text-sm">
                <thead className="muted text-left text-xs"><tr><th className="py-1">Tanggal</th><th>Order</th><th className="w-1/3">Omzet</th><th className="text-right">Laba</th></tr></thead>
                <tbody>{report.byDay.map((d) => (
                  <tr key={d.day} className="border-t border-[var(--line)]">
                    <td className="py-1.5">{d.day}</td><td>{d.orders}</td>
                    <td><span className="mr-2 inline-block h-2 rounded bg-[var(--color-ink-900)] align-middle print:border print:border-black" style={{ width: `${(d.revenue / maxDay) * 60}%` }} />{idr(d.revenue)}</td>
                    <td className="text-right">{idr(d.profit)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-bold">Per produk</h2>
              <table className="mt-3 w-full text-sm"><thead className="muted text-left text-xs"><tr><th>Produk</th><th>Unit</th><th className="text-right">Omzet</th><th className="text-right">Laba</th></tr></thead>
                <tbody>{report.byProduct.map((p) => <tr key={p.sku} className="border-t border-[var(--line)]"><td className="py-1.5">{p.name} <span className="muted">({p.sku})</span></td><td>{p.orders}</td><td className="text-right">{idr(p.revenue)}</td><td className="text-right">{idr(p.profit)}</td></tr>)}</tbody></table>
            </section>
            <div className="space-y-6">
              <section className="card p-5">
                <h2 className="font-bold">Per kategori</h2>
                <table className="mt-3 w-full text-sm"><tbody>{report.byCategory.map((c) => <tr key={c.name} className="border-t border-[var(--line)]"><td className="py-1.5">{c.name}</td><td>{c.orders}</td><td className="text-right">{idr(c.revenue)}</td><td className="text-right">{idr(c.profit)}</td></tr>)}</tbody></table>
              </section>
              <section className="card p-5">
                <h2 className="font-bold">Metode pembayaran</h2>
                <table className="mt-3 w-full text-sm"><tbody>{report.byPayment.map((m) => <tr key={m.method} className="border-t border-[var(--line)]"><td className="py-1.5">{METHOD[m.method] ?? m.method}</td><td>{m.orders}</td><td className="text-right">{idr(m.revenue)}</td></tr>)}</tbody></table>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
