import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, idr, requirePermission } from "@/lib/admin";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "../../confirm-button";
import { computeProfit } from "@/lib/pricing";
import { archiveProduct, deleteProductPermanently, restoreProduct } from "./actions";

export const metadata = { title: "Produk" };
const PAGE = 30;
const STATUS: Record<string, [string, string]> = { PUBLISHED: ["Terbit", "chip-tone-ok"], DRAFT: ["Draft", "chip-tone-mute"] };
const AVAIL: Record<string, string> = { CHECK: "Cek stok", VERIFIED: "Tersedia", PREORDER: "Pre-order", SOLD_OUT: "Habis" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; view?: string; error?: string }> }) {
  const me = await requirePermission("product.manage");
  const manage = can(me.role, "data.manage");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const archived = sp.view === "archived";
  const where: Prisma.ProductWhereInput = { deletedAt: archived ? { not: null } : null, ...(q ? { OR: [{ nameId: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) };
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { brand: { select: { name: true } } } }),
    db.product.count({ where }),
  ]);
  const qs = (patch: Record<string, string>) => new URLSearchParams({ ...(q ? { q } : {}), ...(archived ? { view: "archived" } : {}), ...patch }).toString();

  return (
    <div className="space-y-5">
      <AdminPageHeader title={`${archived ? "Arsip produk" : "Produk"} (${total})`} icon="package">
        <div className="flex gap-2">
          <Link href={archived ? "/admin/products" : "/admin/products?view=archived"} className="btn btn-ghost btn-sm">{archived ? <><Icon name="arrow-left" size={16} />Aktif</> : <><Icon name="history" size={16} />Arsip</>}</Link>
          <Link href="/admin/products/new" className="btn btn-primary btn-sm"><Icon name="plus" size={16} />Produk baru</Link>
        </div>
      </AdminPageHeader>
      <AdminAlert message={sp.error} />
      <form className="flex gap-2" role="search">
        {archived && <input type="hidden" name="view" value="archived" />}
        <div className="relative w-full max-w-sm">
          <Icon name="search" size={18} className="muted pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input name="q" defaultValue={q} className="input !pl-10" placeholder="Cari nama atau SKU…" maxLength={60} aria-label="Cari produk" />
        </div>
        <button className="btn btn-primary">Cari</button>
      </form>

      {rows.length === 0 ? (
        <div className="card grid place-items-center gap-2 p-10 text-center"><span className="muted"><Icon name="package" size={36} /></span><p className="muted">{archived ? "Arsip kosong." : "Belum ada produk."}</p></div>
      ) : (
        <ul className="card divide-y divide-[var(--line)] overflow-hidden">
          {rows.map((p) => {
            const pr = computeProfit(p.sellPrice, p.costPrice);
            const [stLabel, stTone] = STATUS[p.status] ?? [p.status, "chip-tone-mute"];
            return (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${p.id}`} className="block truncate font-semibold hover:underline">{p.nameId}</Link>
                  <p className="muted truncate text-xs">{p.sku} · {p.brand.name}</p>
                </div>
                <div className="text-sm sm:w-44 sm:text-right">
                  <p className="font-bold">{idr(p.sellPrice)}</p>
                  <p className="muted text-xs">Laba {idr(pr.profit)} ({(pr.marginBps / 100).toFixed(0)}%)</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:w-52 sm:justify-end">
                  <span className={`chip ${stTone}`}>{stLabel}</span>
                  <span className="chip">{AVAIL[p.availability] ?? p.availability}</span>
                </div>
                <div className="flex gap-2 text-xs sm:w-36 sm:justify-end">
                  <Link href={`/admin/products/${p.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" size={14} />Ubah</Link>
                  {archived ? (
                    <>
                      <form action={restoreProduct}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm" aria-label={`Pulihkan ${p.nameId}`}>Pulihkan</button></form>
                      {manage && <form action={deleteProductPermanently}><input type="hidden" name="id" value={p.id} /><ConfirmButton className="btn btn-ghost btn-sm text-[var(--color-danger-600)]" message={`Hapus permanen “${p.nameId}” (${p.sku})? Tidak bisa dibatalkan.`}><Icon name="trash" size={14} /></ConfirmButton></form>}
                    </>
                  ) : (
                    <form action={archiveProduct}><input type="hidden" name="id" value={p.id} /><button className="btn btn-ghost btn-sm" aria-label={`Arsipkan ${p.nameId}`}>Arsipkan</button></form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="btn btn-ghost" href={`/admin/products?${qs({ page: String(page - 1) })}`}><Icon name="chevron-left" size={16} />Sebelumnya</Link>}
        <span className="muted">Halaman {page}</span>
        {page * PAGE < total && <Link className="btn btn-ghost" href={`/admin/products?${qs({ page: String(page + 1) })}`}>Berikutnya<Icon name="chevron-right" size={16} /></Link>}
      </div>
    </div>
  );
}
