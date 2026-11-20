import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, fmtDateTime, requirePermission } from "@/lib/admin";
import { CLAIM_LABEL, claimNext, isClaimStatus } from "@/lib/claim-flow";
import { maskPhone } from "@/lib/phone";
import { warrantyOf } from "@/lib/warranty";
import { Icon } from "@/components/icons";
import { AssigneePanel, NoteThread } from "../../assignment-panel";
import { assignUi, isClaimClosed } from "@/lib/assignment";
import { ClaimBadge } from "../claim-badge";
import { StatusForm } from "./status-form";

export const metadata = { title: "Detail klaim" };

function eventText(type: string, data: unknown): string {
  const d = (data ?? {}) as { to?: string; via?: string };
  switch (type) {
    case "submitted": return "Klaim diajukan pelanggan";
    case "status_changed": return `Status: ${d.to && isClaimStatus(d.to) ? CLAIM_LABEL[d.to] : "berubah"}${d.via === "customer" ? " (oleh pelanggan)" : ""}`;
    case "assigned": return "Penanggung jawab diubah";
    default: return type.replace(/_/g, " ");
  }
}

export default async function ClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("claim.manage");
  const { id } = await params;
  const claim = await db.warrantyClaim.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      order: { select: { paidAt: true, deliveredAt: true, inquiry: { select: { id: true, code: true, customerName: true, phone: true, productSnapshot: true } } } },
      events: { where: { type: { not: "note" } }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!claim) notFound();
  const manageOthers = can(me.role, "inquiry.assignOthers");
  const [noteRows, staff] = await Promise.all([
    db.claimEvent.findMany({ where: { claimId: id, type: "note" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, data: true, actorId: true, createdAt: true } }),
    manageOthers ? db.adminUser.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true } }) : Promise.resolve(null),
  ]);
  const ids = [...new Set(noteRows.map((n) => n.actorId).filter((v): v is string => !!v))];
  const names = ids.length ? new Map((await db.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name])) : new Map<string, string>();
  const notes = noteRows.map((n) => ({ id: n.id, text: String((n.data as { text?: string } | null)?.text ?? ""), author: (n.actorId && names.get(n.actorId)) || "Petugas", at: fmtDateTime(n.createdAt) }));

  const inq = claim.order.inquiry;
  const w = warrantyOf(claim.order);
  const seePhone = can(me.role, "pii.view");
  const phone = seePhone ? inq.phone : maskPhone(inq.phone);
  const snap = inq.productSnapshot as { name?: string };
  const wa = `https://wa.me/${inq.phone}?text=${encodeURIComponent(`Halo ${inq.customerName}, kami dari TechRevive terkait klaim garansi ${claim.code} untuk ${snap.name ?? "produk Anda"}.`)}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/claims" className="muted inline-flex min-h-11 items-center gap-1 text-sm hover:underline"><Icon name="arrow-left" size={16} />Klaim garansi</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-extrabold tracking-tight">{claim.code}</h1>
          <ClaimBadge status={claim.status} />
        </div>
        <p className="muted mt-1 text-sm">{snap.name} · {inq.customerName}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
        <div className="space-y-6">
          <section className="card space-y-3 p-5 text-sm">
            <h2 className="font-bold">Keluhan pelanggan</h2>
            <p className="whitespace-pre-line break-words">{claim.issue}</p>
            <p className="muted text-xs">Diajukan {fmtDateTime(claim.createdAt)}</p>
            {claim.resolution && <p className="rounded-lg bg-[var(--color-ink-100)] p-3 dark:bg-[var(--color-ink-800)]"><b>Catatan ke pelanggan: </b>{claim.resolution}</p>}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="font-bold">Proses klaim</h2>
            <StatusForm id={claim.id} options={[...claimNext(claim.status)]} />
          </section>

          <NoteThread entity="claim" id={claim.id} notes={notes} />
        </div>

        <aside className="space-y-6">
          <AssigneePanel
            entity="claim" id={claim.id} assignee={claim.assignee} meId={me.id} users={staff} closed={isClaimClosed(claim.status)}
            ui={assignUi({ meId: me.id, canManageOthers: manageOthers, currentAssigneeId: claim.assignee?.id ?? null, closed: isClaimClosed(claim.status) })}
          />

          <section className="card space-y-2 p-5 text-sm">
            <h2 className="font-bold">Pelanggan dan pesanan</h2>
            <p>{inq.customerName}</p>
            <p className="muted">{phone}</p>
            <p><Link href={`/admin/inquiries/${inq.id}`} className="font-mono text-xs font-bold underline-offset-4 hover:underline">{inq.code}</Link></p>
            <p className="muted">
              {w.state === "active" && `Garansi sampai ${fmtDateTime(w.endsAt)} (sisa ${w.daysLeft} hari)`}
              {w.state === "expired" && `Garansi berakhir ${fmtDateTime(w.endsAt)}`}
              {w.state === "none" && "Garansi belum berlaku"}
            </p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-accent mt-2 w-full"><Icon name="message-circle" size={18} />Hubungi via WhatsApp</a>
          </section>

          <details className="card p-5 text-sm">
            <summary className="cursor-pointer font-bold">Riwayat ({claim.events.length})</summary>
            <ul className="mt-3 space-y-3">
              {claim.events.map((e) => (
                <li key={e.id}><p className="font-medium">{eventText(e.type, e.data)}</p><p className="muted text-xs">{fmtDateTime(e.createdAt)}</p></li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </div>
  );
}
