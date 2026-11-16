import Link from "next/link";
import { db } from "@/lib/db";
import { can, fmtDateTime, idr, requireAdmin } from "@/lib/admin";
import { expireQuotes } from "@/lib/maintenance";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Icon, type IconName } from "@/components/icons";

export const metadata = { title: "Dashboard" };

const DAY = 24 * 3600 * 1000;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const me = await requireAdmin();
  const { denied } = await searchParams;
  const now = new Date();
  // Awal bulan menurut WIB (UTC+7), bukan UTC.
  const wib = new Date(now.getTime() + 7 * 3600 * 1000);
  const startMonth = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), 1) - 7 * 3600 * 1000);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const since14 = new Date(now.getTime() - 14 * DAY);
  const endToday = new Date(now.getTime() + DAY);

  // Cadangan bila jadwal otomatis belum aktif; jalur utama adalah /api/cron/maintenance.
  await expireQuotes(now);

  const [byStatus, dueFollowUps, recent, orders, inquiries30, ordersCount30, topGroups, daily, staleVerified, stockReview] = await Promise.all([
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    db.inquiry.findMany({
      where: { followUpAt: { lte: endToday }, status: { notIn: ["DELIVERED", "CANCELLED", "EXPIRED"] } },
      orderBy: { followUpAt: "asc" }, take: 8,
      select: { id: true, code: true, customerName: true, followUpAt: true, productSnapshot: true },
    }),
    db.inquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, code: true, customerName: true, createdAt: true, productSnapshot: true } }),
    db.order.findMany({ where: { paidAt: { gte: startMonth } }, select: { itemPrice: true, itemCost: true, paymentFee: true } }),
    db.inquiry.count({ where: { createdAt: { gte: since30 } } }),
    db.order.count({ where: { createdAt: { gte: since30 } } }),
    db.inquiry.groupBy({ by: ["productId"], where: { createdAt: { gte: since30 } }, _count: { _all: true }, orderBy: { _count: { productId: "desc" } }, take: 5 }),
    db.inquiry.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    db.product.count({ where: { status: "PUBLISHED", deletedAt: null, availability: "VERIFIED", verifiedAt: { lt: new Date(now.getTime() - 48 * 3600 * 1000) } } }),
    can(me.role, "stock.review")
      ? db.order.findMany({
          where: { paidAt: { not: null }, stockAutoApplied: false, stockReviewedAt: null, inquiry: { status: { not: "CANCELLED" } } },
          orderBy: { paidAt: "desc" }, take: 8,
          select: { inquiryId: true, paidAt: true, inquiry: { select: { code: true, productSnapshot: true } } },
        })
      : Promise.resolve([]),
  ]);

  const topProducts = await db.product.findMany({ where: { id: { in: topGroups.map((g) => g.productId) } }, select: { id: true, nameId: true, sku: true } });
  const statusCount = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;

  const revenue = orders.reduce((a, o) => a + o.itemPrice, 0);
  const profit = orders.reduce((a, o) => a + o.itemPrice - o.itemCost - o.paymentFee, 0);
  const conversion = inquiries30 ? Math.round((ordersCount30 / inquiries30) * 1000) / 10 : 0;

  // 14 hari terakhir, bucket per hari WIB
  const buckets = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * DAY);
    return { key: d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }), n: 0 };
  });
  for (const r of daily) {
    const k = r.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const b = buckets.find((x) => x.key === k);
    if (b) b.n += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.n));

  const kpis = [
    { label: "Inquiry baru", value: statusCount.NEW ?? 0, href: "/admin/inquiries?status=NEW", icon: "inbox" as IconName },
    { label: "Menunggu supplier", value: statusCount.SUPPLIER_CHECKING ?? 0, href: "/admin/inquiries?status=SUPPLIER_CHECKING", icon: "clock" as IconName },
    { label: "Menunggu pembayaran", value: statusCount.AWAITING_PAYMENT ?? 0, href: "/admin/inquiries?status=AWAITING_PAYMENT", icon: "wallet" as IconName },
    { label: "Konversi 30 hari", value: `${conversion}%`, href: "/admin/inquiries", icon: "chart" as IconName },
    ...(can(me.role, "finance.view")
      ? [
          { label: "Omzet bulan ini", value: idr(revenue), href: "/admin/inquiries", icon: "receipt" as IconName },
          { label: "Laba kotor bulan ini", value: idr(profit), href: "/admin/inquiries", icon: "tag" as IconName },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Dashboard" icon="dashboard" />
      {denied && <p className="card flex gap-2 p-4 text-sm text-[var(--color-danger-600)]"><Icon name="lock" size={18} className="shrink-0" />Anda tidak punya akses ke halaman tersebut.</p>}
      {staleVerified > 0 && <p className="card flex gap-2 p-4 text-sm"><Icon name="alert" size={18} className="mt-0.5 shrink-0 text-amber-600" /><span>{staleVerified} produk berstatus “Tersedia” sudah lebih dari 48 jam dan otomatis tampil sebagai “Cek Ketersediaan”. Konfirmasi ulang ke supplier.</span></p>}

      {stockReview.length > 0 && (
        <section className="card border-[var(--color-brand-500)] p-5">
          <h2 className="font-bold">Perlu tinjau stok ({stockReview.length})</h2>
          <p className="muted text-xs">Barang sudah terjual tetapi jumlah unit tidak tercatat. Tentukan Habis atau masih ada.</p>
          <ul className="mt-3 divide-y divide-[var(--line)] text-sm">
            {stockReview.map((o) => (
              <li key={o.inquiryId} className="py-3">
                <Link href={`/admin/inquiries/${o.inquiryId}`} className="font-semibold underline-offset-4 hover:underline">{o.inquiry.code}</Link> · {(o.inquiry.productSnapshot as { name?: string }).name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="card hover-lift flex items-start justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="muted text-xs font-semibold uppercase tracking-wide">{k.label}</p>
              <p className="mt-2 truncate text-2xl font-extrabold sm:text-3xl">{k.value}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300"><Icon name={k.icon} size={20} /></span>
          </Link>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="font-bold">Inquiry 14 hari terakhir</h2>
        <div className="mt-4 flex h-32 items-end gap-1.5" role="img" aria-label="Grafik inquiry per hari">
          {buckets.map((b) => (
            <div key={b.key} className="group relative flex-1">
              <div className="rounded-t bg-[var(--color-ink-900)] dark:bg-[var(--color-brand-500)]" style={{ height: `${(b.n / max) * 100}%`, minHeight: b.n ? 4 : 1 }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-[var(--color-ink-900)] px-1.5 py-0.5 text-[10px] text-white group-hover:block">{b.key.slice(5)}: {b.n}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold">Follow-up hari ini / terlewat</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] text-sm">
            {dueFollowUps.length === 0 && <li className="muted py-3">Tidak ada.</li>}
            {dueFollowUps.map((i) => (
              <li key={i.id} className="py-3">
                <Link href={`/admin/inquiries/${i.id}`} className="font-semibold underline-offset-4 hover:underline">{i.code}</Link> · {i.customerName}
                <p className="muted text-xs">{(i.productSnapshot as { name?: string }).name} · {i.followUpAt ? fmtDateTime(i.followUpAt) : ""}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="font-bold">Inquiry baru</h2>
          <ul className="mt-3 divide-y divide-[var(--line)] text-sm">
            {recent.length === 0 && <li className="muted py-3">Belum ada.</li>}
            {recent.map((i) => (
              <li key={i.id} className="py-3">
                <Link href={`/admin/inquiries/${i.id}`} className="font-semibold underline-offset-4 hover:underline">{i.code}</Link> · {i.customerName}
                <p className="muted text-xs">{(i.productSnapshot as { name?: string }).name} · {fmtDateTime(i.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-bold">Produk paling dicari (30 hari)</h2>
        <ol className="mt-3 divide-y divide-[var(--line)] text-sm">
          {topGroups.length === 0 && <li className="muted py-3">Belum ada data.</li>}
          {topGroups.map((g) => {
            const p = topProducts.find((x) => x.id === g.productId);
            return (
              <li key={g.productId} className="flex justify-between py-3">
                <span>{p?.nameId ?? g.productId} <span className="muted">({p?.sku})</span></span>
                <span className="font-bold">{g._count._all}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
