import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";

export const metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true } } } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Audit log <span className="muted text-base font-medium">(200 terakhir)</span></h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="p-3">Waktu</th><th className="p-3">Admin</th><th className="p-3">Aksi</th><th className="p-3">Objek</th><th className="p-3">Detail</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="muted whitespace-nowrap p-3">{fmtDateTime(l.createdAt)}</td>
                <td className="p-3">{l.actor?.name ?? "—"}</td>
                <td className="p-3 font-mono text-xs">{l.action}</td>
                <td className="muted p-3 text-xs">{l.entity} {l.entityId?.slice(-6)}</td>
                <td className="muted max-w-xs truncate p-3 font-mono text-xs">{l.diff ? JSON.stringify(l.diff) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
