import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { idr, requirePermission } from "@/lib/admin";
import { computeProfit } from "@/lib/pricing";
import { archiveProduct } from "./actions";

export const metadata = { title: "Produk" };
const PAGE = 30;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermission("product.manage");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const where: Prisma.ProductWhereInput = { deletedAt: null, ...(q ? { OR: [{ nameId: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}) };
  const [rows, total] = await Promise.all([
    db.product.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { brand: { select: { name: true } }, supplier: { select: { name: true } } } }),
    db.product.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Produk <span className="muted text-base font-medium">({total})</span></h1>
        <Link href="/admin/products/new" className="btn btn-primary">+ Produk baru</Link>
      </div>
      <form className="flex gap-2" role="search">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="Cari nama atau SKU…" maxLength={60} />
        <button className="btn btn-primary">Cari</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="p-3">SKU</th><th className="p-3">Nama</th><th className="p-3">Modal</th><th className="p-3">Jual</th><th className="p-3">Laba</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.length === 0 && <tr><td colSpan={7} className="muted p-6 text-center">Belum ada produk.</td></tr>}
            {rows.map((p) => {
              const pr = computeProfit(p.sellPrice, p.costPrice);
              return (
                <tr key={p.id}>
                  <td className="p-3 font-mono text-xs">{p.sku}</td>
                  <td className="p-3"><Link href={`/admin/products/${p.id}`} className="font-semibold underline-offset-4 hover:underline">{p.nameId}</Link><p className="muted text-xs">{p.brand.name} · {p.supplier?.name ?? "tanpa supplier"}</p></td>
                  <td className="p-3">{idr(p.costPrice)}</td>
                  <td className="p-3 font-semibold">{idr(p.sellPrice)}</td>
                  <td className="p-3">{idr(pr.profit)} <span className="muted text-xs">({(pr.marginBps / 100).toFixed(1)}%)</span></td>
                  <td className="p-3"><span className="chip">{p.status}</span> <span className="chip">{p.availability}</span></td>
                  <td className="p-3">
                    <form action={archiveProduct}><input type="hidden" name="id" value={p.id} /><button className="text-xs underline" aria-label={`Arsipkan ${p.nameId}`}>Arsipkan</button></form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="btn btn-ghost" href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>← Sebelumnya</Link>}
        <span className="muted">Halaman {page}</span>
        {page * PAGE < total && <Link className="btn btn-ghost" href={`/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>Berikutnya →</Link>}
      </div>
    </div>
  );
}
