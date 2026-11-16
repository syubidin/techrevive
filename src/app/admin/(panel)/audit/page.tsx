import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin-page-header";

export const metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { name: true } } } });
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Audit log" icon="history" />
      <p className="muted text-sm">100 aktivitas terakhir. Ketuk satu baris untuk melihat detailnya.</p>
      <ul className="card divide-y divide-[var(--line)] overflow-hidden text-sm">
        {logs.map((l) => (
          <li key={l.id}>
            <details className="p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs font-bold">{l.action}</span>
                <span>{l.actor?.name ?? "Sistem"}</span>
                <span className="muted ml-auto text-xs">{fmtDateTime(l.createdAt)}</span>
              </summary>
              <p className="muted mt-2 text-xs">{l.entity} {l.entityId?.slice(-8)}</p>
              {l.diff != null && <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--color-ink-100)] p-3 text-xs dark:bg-[var(--color-ink-800)]">{JSON.stringify(l.diff, null, 2)}</pre>}
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
