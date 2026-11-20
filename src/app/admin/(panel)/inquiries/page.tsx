import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDateTime, requireAdmin } from "@/lib/admin";
import { STATUS_GROUPS } from "@/lib/inquiry-status";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Inquiry" };

const PAGE = 30;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ g?: string; q?: string; page?: string; a?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const assign = sp.a === "mine" || sp.a === "none" ? sp.a : null;
  const group = STATUS_GROUPS.find((g) => g.key === sp.g);
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const where: Prisma.InquiryWhereInput = {
    ...(group ? { status: { in: group.statuses } } : {}),
    ...(assign === "mine" ? { assigneeId: me.id } : assign === "none" ? { assigneeId: null, status: { notIn: ["DELIVERED", "CANCELLED", "EXPIRED"] } } : {}),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || "x" } }] } : {}),
  };
  const [rows, total, counts] = await Promise.all([
    db.inquiry.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, code: true, customerName: true, status: true, createdAt: true, followUpAt: true, productSnapshot: true, assignee: { select: { name: true } } } }),
    db.inquiry.count({ where }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (statuses: string[]) => counts.filter((c) => statuses.includes(c.status)).reduce((a, c) => a + c._count._all, 0);
  const qs = (patch: Record<string, string>) => new URLSearchParams({ ...(group ? { g: group.key } : {}), ...(q ? { q } : {}), ...(assign ? { a: assign } : {}), ...patch }).toString();
  const now = Date.now();

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Inquiry" icon="inbox" />
      <form className="flex gap-2" role="search">
        {group && <input type="hidden" name="g" value={group.key} />}
        {assign && <input type="hidden" name="a" value={assign} />}
        <div className="relative w-full max-w-sm">
          <Icon name="search" size={18} className="muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input name="q" defaultValue={q} className="input !pl-10" placeholder="Cari kode, nama, atau nomor…" maxLength={60} aria-label="Cari inquiry" />
        </div>
        <button className="btn btn-primary">Cari</button>
      </form>

      <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Kelompok status">
        <Link href={`/admin/inquiries${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={`chip shrink-0 !min-h-9 ${!group ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>Semua</Link>
        {STATUS_GROUPS.map((g) => {
          const n = countOf(g.statuses);
          return (
            <Link key={g.key} href={`/admin/inquiries?${qs({ g: g.key, page: "1" })}`} className={`chip shrink-0 !min-h-9 ${group?.key === g.key ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>
              {g.label}{n > 0 && <span className="opacity-70">· {n}</span>}
            </Link>
          );
        })}
      </nav>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Penanggung jawab">
        {([[null, "Semua petugas"], ["mine", "Tugas saya"], ["none", "Belum diambil"]] as const).map(([key, label]) => {
          const params = new URLSearchParams({ ...(group ? { g: group.key } : {}), ...(q ? { q } : {}), ...(key ? { a: key } : {}) }).toString();
          return <Link key={label} href={`/admin/inquiries${params ? `?${params}` : ""}`} aria-current={assign === key ? "true" : undefined} className={`chip !min-h-9 ${assign === key ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{label}</Link>;
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center"><span className="muted"><Icon name="inbox" size={36} /></span><p className="muted">Tidak ada inquiry.</p></div>
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {rows.map((r) => {
            const due = r.followUpAt && r.followUpAt.getTime() <= now && !["DELIVERED", "CANCELLED", "EXPIRED"].includes(r.status);
            return (
              <li key={r.id}>
                <Link href={`/admin/inquiries/${r.id}`} className="flex flex-col gap-1.5 p-4 transition hover:bg-[var(--color-ink-100)] sm:flex-row sm:items-center sm:gap-4 dark:hover:bg-[var(--color-ink-800)]">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{r.code}</span>{due && <span className="chip chip-tone-warn !min-h-0 !px-2 !py-0.5 !text-[11px]"><Icon name="clock" size={12} />Follow-up</span>}</p>
                    <p className="truncate text-sm">{r.customerName} <span className="muted">· {(r.productSnapshot as { name?: string }).name}</span></p>
                    <p className="muted flex items-center gap-1 text-xs"><Icon name={r.assignee ? "user-check" : "user"} size={12} />{r.assignee ? r.assignee.name : "Belum diambil"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <StatusBadge status={r.status} />
                    <span className="muted text-xs">{fmtDateTime(r.createdAt)}</span>
                    <Icon name="chevron-right" size={16} className="muted hidden sm:block" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="btn btn-ghost" href={`/admin/inquiries?${qs({ page: String(page - 1) })}`}><Icon name="chevron-left" size={16} />Sebelumnya</Link>}
        <span className="muted">Halaman {page} · {total} data</span>
        {page * PAGE < total && <Link className="btn btn-ghost" href={`/admin/inquiries?${qs({ page: String(page + 1) })}`}>Berikutnya<Icon name="chevron-right" size={16} /></Link>}
      </div>
    </div>
  );
}
