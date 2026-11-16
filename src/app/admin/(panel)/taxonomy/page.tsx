import Link from "next/link";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/admin";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmButton } from "../../confirm-button";
import { addBrand, addCategory, addSpec, addSupplier } from "./actions";
import { deleteBrand, deleteCategory, deleteSpec, deleteSupplier, updateBrand, updateCategory, updateSpec, updateSupplier } from "./manage-actions";

export const metadata = { title: "Kategori & Spek" };

const TABS = [
  { key: "kategori", label: "Kategori" },
  { key: "spek", label: "Spek filter" },
  { key: "merk", label: "Merk" },
  { key: "supplier", label: "Supplier" },
] as const;

const F = ({ label, name, ...p }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div><label className="label" htmlFor={`${name}-${label}`}>{label}</label><input id={`${name}-${label}`} name={name} className="input" {...p} /></div>
);

export default async function Taxonomy({ searchParams }: { searchParams: Promise<{ error?: string; tab?: string; cat?: string }> }) {
  const me = await requirePermission("taxonomy.manage");
  const edit = can(me.role, "taxonomy.edit"); // ubah: Owner dan Developer
  const manage = can(me.role, "data.manage"); // hapus: hanya Admin/Developer
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "kategori";
  const [categories, brands, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { nameId: "asc" }, include: { specs: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);
  const cat = categories.find((c) => c.id === sp.cat) ?? categories[0];
  const row = "flex flex-col gap-2 p-4 text-sm";

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Kategori, merk & spek" icon="layers" />
      <AdminAlert message={sp.error} />
      <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0" aria-label="Bagian">
        {TABS.map((t) => <Link key={t.key} href={`/admin/taxonomy?tab=${t.key}`} className={`chip shrink-0 !min-h-9 ${tab === t.key ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{t.label}</Link>)}
      </nav>
      {edit && !manage && <p className="muted text-xs">Anda dapat menambah dan mengubah. Menghapus hanya bisa dilakukan Admin/Developer.</p>}

      {tab === "kategori" && (
        <>
          <details className="card p-4"><summary className="cursor-pointer font-bold">Tambah kategori</summary>
            <form action={addCategory} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><F label="Nama (ID)" name="nameId" required /><F label="Name (EN)" name="nameEn" required /><button className="btn btn-primary">Tambah</button></form>
          </details>
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {categories.length === 0 && <li className="muted p-6 text-center text-sm">Belum ada kategori.</li>}
            {categories.map((c) => (
              <li key={c.id} className={row}>
                <p className="font-semibold">{c.nameId} <span className="muted text-xs font-normal">/ {c.nameEn} · {c._count.products} produk · {c.specs.length} spek</span></p>
                {edit && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold underline">Ubah{manage ? " / hapus" : ""}</summary>
                    <form action={updateCategory} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="nameId" className="input" defaultValue={c.nameId} required aria-label="Nama (ID)" />
                      <input name="nameEn" className="input" defaultValue={c.nameEn} required aria-label="Name (EN)" />
                      <button className="btn btn-primary">Simpan</button>
                    </form>
                    {manage && <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Hapus kategori “${c.nameId}” beserta definisi spek-nya? Tindakan ini tidak bisa dibatalkan.`}>Hapus kategori</ConfirmButton></form>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "spek" && (
        <>
          <p className="muted text-sm">Spek menjadi filter di katalog (mis. RAM, prosesor). Pilih kategori untuk melihat dan menambahnya.</p>
          <nav className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0" aria-label="Kategori">
            {categories.map((c) => <Link key={c.id} href={`/admin/taxonomy?tab=spek&cat=${c.id}`} className={`chip shrink-0 !min-h-9 ${cat?.id === c.id ? "!bg-[var(--color-ink-900)] !text-white" : "bg-[var(--card)]"}`}>{c.nameId}</Link>)}
          </nav>
          {cat ? (
            <>
              <ul className="card divide-y divide-[var(--line)] overflow-hidden">
                {cat.specs.length === 0 && <li className="muted p-6 text-center text-sm">Belum ada spek untuk {cat.nameId}.</li>}
                {cat.specs.map((s) => (
                  <li key={s.id} className={row}>
                    <p className="font-semibold">{s.labelId} <span className="muted text-xs font-normal">· <code>{s.key}</code> · {s.type === "NUMBER" ? "angka" : s.type === "ENUM" ? "pilihan" : "ya/tidak"}{s.unit ? ` (${s.unit})` : ""}{s.options.length ? ` · ${s.options.join(", ")}` : ""}</span></p>
                    {edit && (
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold underline">Ubah{manage ? " / hapus" : ""}</summary>
                        <form action={updateSpec} className="mt-2 grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="id" value={s.id} />
                          <input name="labelId" className="input" defaultValue={s.labelId} required aria-label="Label (ID)" />
                          <input name="labelEn" className="input" defaultValue={s.labelEn} required aria-label="Label (EN)" />
                          <input name="unit" className="input" defaultValue={s.unit ?? ""} placeholder="Satuan" aria-label="Satuan" />
                          {s.type === "ENUM" && <input name="options" className="input" defaultValue={s.options.join(", ")} placeholder="Opsi dipisah koma" aria-label="Opsi" />}
                          <button className="btn btn-primary sm:w-fit">Simpan</button>
                        </form>
                        <p className="muted mt-1 text-xs">Kunci dan tipe tidak bisa diubah agar data produk tetap valid.</p>
                        {manage && <form action={deleteSpec} className="mt-1"><input type="hidden" name="id" value={s.id} /><ConfirmButton message={`Hapus spek “${s.key}”? Filter di katalog untuk spek ini akan hilang.`}>Hapus spek</ConfirmButton></form>}
                      </details>
                    )}
                  </li>
                ))}
              </ul>
              <details className="card p-4"><summary className="cursor-pointer font-bold">Tambah spek untuk {cat.nameId}</summary>
                <form action={addSpec} className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <F label="Kunci (mis. ram_gb)" name="key" required pattern="[a-z][a-z0-9_]{1,39}" />
                  <div><label className="label" htmlFor="sp-type">Tipe</label><select id="sp-type" name="type" className="input"><option value="NUMBER">Angka (rentang)</option><option value="ENUM">Pilihan</option><option value="BOOLEAN">Ya/Tidak</option></select></div>
                  <F label="Satuan (GB, inci…)" name="unit" />
                  <F label="Label (ID)" name="labelId" required /><F label="Label (EN)" name="labelEn" required />
                  <div className="sm:col-span-3"><F label="Opsi (khusus tipe Pilihan, pisahkan koma)" name="options" placeholder="i3, i5, i7, Ryzen 5" /></div>
                  <button className="btn btn-primary sm:col-span-3 sm:w-fit">Tambah spek</button>
                </form>
              </details>
            </>
          ) : <p className="muted text-sm">Buat kategori dulu.</p>}
        </>
      )}

      {tab === "merk" && (
        <>
          <details className="card p-4"><summary className="cursor-pointer font-bold">Tambah merk</summary>
            <form action={addBrand} className="mt-3 flex items-end gap-2"><div className="flex-1"><F label="Nama merk" name="name" required /></div><button className="btn btn-primary">Tambah</button></form>
          </details>
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {brands.length === 0 && <li className="muted p-6 text-center text-sm">Belum ada merk.</li>}
            {brands.map((b) => (
              <li key={b.id} className={row}>
                <p className="font-semibold">{b.name} <span className="muted text-xs font-normal">· {b._count.products} produk</span></p>
                {edit && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold underline">Ubah{manage ? " / hapus" : ""}</summary>
                    <form action={updateBrand} className="mt-2 flex gap-2"><input type="hidden" name="id" value={b.id} /><input name="name" className="input" defaultValue={b.name} required aria-label="Nama merk" /><button className="btn btn-primary">Simpan</button></form>
                    {manage && <form action={deleteBrand} className="mt-2"><input type="hidden" name="id" value={b.id} /><ConfirmButton message={`Hapus merk “${b.name}”?`}>Hapus merk</ConfirmButton></form>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "supplier" && (
        <>
          <details className="card p-4"><summary className="cursor-pointer font-bold">Tambah supplier</summary>
            <form action={addSupplier} className="mt-3 grid gap-3 sm:grid-cols-3"><F label="Nama" name="name" required /><F label="No. WhatsApp" name="waNumber" inputMode="tel" /><F label="Catatan" name="notes" /><button className="btn btn-primary sm:w-fit">Tambah</button></form>
          </details>
          <ul className="card divide-y divide-[var(--line)] overflow-hidden">
            {suppliers.length === 0 && <li className="muted p-6 text-center text-sm">Belum ada supplier.</li>}
            {suppliers.map((s) => (
              <li key={s.id} className={row}>
                <p className="font-semibold">{s.name}{s.waNumber ? <span className="muted text-xs font-normal"> · {s.waNumber}</span> : ""}</p>
                {edit && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold underline">Ubah{manage ? " / hapus" : ""}</summary>
                    <form action={updateSupplier} className="mt-2 grid gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input name="name" className="input" defaultValue={s.name} required aria-label="Nama supplier" />
                      <input name="waNumber" className="input" defaultValue={s.waNumber ?? ""} inputMode="tel" placeholder="No. WhatsApp" aria-label="No. WhatsApp" />
                      <input name="notes" className="input" defaultValue={s.notes ?? ""} placeholder="Catatan" aria-label="Catatan" />
                      <button className="btn btn-primary sm:w-fit">Simpan</button>
                    </form>
                    {manage && <form action={deleteSupplier} className="mt-2"><input type="hidden" name="id" value={s.id} /><ConfirmButton message={`Hapus supplier “${s.name}”? Produk terkait menjadi “tanpa supplier”.`}>Hapus supplier</ConfirmButton></form>}
                  </details>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
