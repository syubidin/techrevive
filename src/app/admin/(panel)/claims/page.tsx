import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { CLAIM_LABEL, CLAIM_OPEN, CLAIM_STATUSES, isClaimStatus, type ClaimStatus } from "@/lib/claim-flow";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Icon } from "@/components/icons";
import { ClaimBadge } from "./claim-badge";

export const metadata = { title: "Klaim garansi" };
const PAGE = 30;

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ s?: string; q?: string; page?: string; a?: string }> }) {
  const me = await requirePermission("claim.manage");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const mine = sp.a === "mine";
  const filter: "open" | ClaimStatus | null = sp.s === "open" ? "open" : isClaimStatus(sp.s) ? sp.s : null;

  const where: Prisma.WarrantyClaimWhereInput = {
    ...(filter === "open" ? { status: { in: [...CLAIM_OPEN] } } : filter ? { status: filter } : {}),
    ...(mine ? { assigneeId: me.id } : {}),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { order: { inquiry: { code: { contains: q, mode: "insensitive" } } } }, { order: { inquiry: { customerName: { contains: q, mode: "insensitive" } } } }] } : {}),
  };
  const [rows, total, counts] = await Promise.all([
    db.warrantyClaim.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE,
      select: { id: true, code: true, status: true, issue: true, createdAt: true, assignee: { select: { name: true } }, order: { select: { inquiry: { select: { code: true, customerName: true, productSnapshot: true } } } } },
    }),
    db.warrantyClaim.count({ where }),
    db.warrantyClaim.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (st: readonly string[]) => counts.filter((c) => st.includes(c.status)).reduce((a, c) => a + c._count._all, 0);
  const qs = (patch: Record<string, string>) => new URLSearchParams({ ...(filter ? { s: filter } : {}), ...(q ? { q } : {}), ...(mine ? { a: "mine" } : {}), ...patch }).toString();
  const chip = (active: boolean) => `chip shrink-0 !min-h-9 ${active ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`;

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Klaim garansi" icon="wrench" />
      <form className="flex gap-2" role="search">
        {filter && <input type="hidden" name="s" value={filter} />}
        {mine && <input type="hidden" name="a" value="mine" />}
        <div className="relative w-full max-w-sm">
          <Icon name="search" size={18} className="muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input name="q" defaultValue={q} className="input !pl-10" placeholder="Cari kode klaim, kode pesanan, nama…" maxLength={60} aria-label="Cari klaim" />
        </div>
        <button className="btn btn-primary">Cari</button>
      </form>

      <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Status klaim">
        <Link href={`/admin/claims${mine ? "?a=mine" : ""}`} className={chip(!filter)}>Semua</Link>
        <Link href={`/admin/claims?${qs({ s: "open", page: "1" })}`} className={chip(filter === "open")}>Berjalan<span className="opacity-70">· {countOf(CLAIM_OPEN)}</span></Link>
        {CLAIM_STATUSES.map((st) => (
          <Link key={st} href={`/admin/claims?${qs({ s: st, page: "1" })}`} className={chip(filter === st)}>{CLAIM_LABEL[st]}{countOf([st]) > 0 && <span className="opacity-70">· {countOf([st])}</span>}</Link>
        ))}
        <Link href={`/admin/claims?${new URLSearchParams({ ...(filter ? { s: filter } : {}), ...(q ? { q } : {}), ...(mine ? {} : { a: "mine" }) }).toString()}`} className={chip(mine)}>Tugas saya</Link>
      </nav>

      {rows.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center"><span className="muted"><Icon name="wrench" size={36} /></span><p className="muted">Belum ada klaim.</p></div>
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/claims/${r.id}`} className="flex flex-col gap-1.5 p-4 transition hover:bg-[var(--color-ink-100)] sm:flex-row sm:items-center sm:gap-4 dark:hover:bg-[var(--color-ink-800)]">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-bold">{r.code}</span><span className="muted font-mono text-xs">{r.order.inquiry.code}</span></p>
                  <p className="truncate text-sm">{r.order.inquiry.customerName} <span className="muted">· {(r.order.inquiry.productSnapshot as { name?: string }).name}</span></p>
                  <p className="muted truncate text-xs">{r.issue}</p>
                  <p className="muted flex items-center gap-1 text-xs"><Icon name={r.assignee ? "user-check" : "user"} size={12} />{r.assignee?.name ?? "Belum ditugaskan"}</p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <ClaimBadge status={r.status} />
                  <span className="muted text-xs">{fmtDateTime(r.createdAt)}</span>
                  <Icon name="chevron-right" size={16} className="muted hidden sm:block" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="btn btn-ghost" href={`/admin/claims?${qs({ page: String(page - 1) })}`}><Icon name="chevron-left" size={16} />Sebelumnya</Link>}
        <span className="muted">Halaman {page} · {total} data</span>
        {page * PAGE < total && <Link className="btn btn-ghost" href={`/admin/claims?${qs({ page: String(page + 1) })}`}>Berikutnya<Icon name="chevron-right" size={16} /></Link>}
      </div>
    </div>
  );
}
