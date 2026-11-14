import Link from "next/link";
import type { InquiryStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDateTime, requireAdmin } from "@/lib/admin";
import { STATUS_KEYS, STATUS_LABEL } from "@/lib/inquiry-status";

export const metadata = { title: "Inquiry" };

const PAGE = 30;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUS_KEYS.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const where: Prisma.InquiryWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || "x" } }] } : {}),
  };
  const [rows, total, counts] = await Promise.all([
    db.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, code: true, customerName: true, status: true, createdAt: true, followUpAt: true, productSnapshot: true } }),
    db.inquiry.count({ where }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: InquiryStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const qs = (patch: Record<string, string>) => new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), ...patch }).toString();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Inquiry</h1>
      <form className="flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Cari kode, nama, atau nomor…" maxLength={60} />
        <button className="btn btn-primary">Cari</button>
      </form>
      <nav className="flex flex-wrap gap-2 text-xs" aria-label="Status">
        <Link href="/admin/inquiries" className={`chip ${!status ? "bg-[var(--color-ink-900)] text-white" : ""}`}>Semua</Link>
        {STATUS_KEYS.map((s) => (
          <Link key={s} href={`/admin/inquiries?${qs({ status: s })}`} className={`chip ${status === s ? "bg-[var(--color-ink-900)] text-white" : ""}`}>{STATUS_LABEL[s]} · {countOf(s)}</Link>
        ))}
      </nav>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="p-3">Kode</th><th className="p-3">Customer</th><th className="p-3">Produk</th><th className="p-3">Status</th><th className="p-3">Masuk</th><th className="p-3">Follow-up</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.length === 0 && <tr><td colSpan={6} className="muted p-6 text-center">Tidak ada data.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--color-ink-100)] dark:hover:bg-[var(--color-ink-800)]">
                <td className="p-3 font-mono"><Link className="font-bold underline-offset-4 hover:underline" href={`/admin/inquiries/${r.id}`}>{r.code}</Link></td>
                <td className="p-3">{r.customerName}</td>
                <td className="p-3">{(r.productSnapshot as { name?: string }).name}</td>
                <td className="p-3"><span className="chip">{STATUS_LABEL[r.status]}</span></td>
                <td className="muted p-3">{fmtDateTime(r.createdAt)}</td>
                <td className="muted p-3">{r.followUpAt ? fmtDateTime(r.followUpAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="btn btn-ghost" href={`/admin/inquiries?${qs({ page: String(page - 1) })}`}>← Sebelumnya</Link>}
        <span className="muted">Halaman {page} · {total} data</span>
        {page * PAGE < total && <Link className="btn btn-ghost" href={`/admin/inquiries?${qs({ page: String(page + 1) })}`}>Berikutnya →</Link>}
      </div>
    </div>
  );
}
