import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/admin";
import { ConfirmButton } from "../../confirm-button";
import { addBrand, addCategory, addSpec, addSupplier } from "./actions";
import { deleteBrand, deleteCategory, deleteSpec, deleteSupplier, updateBrand, updateCategory, updateSpec, updateSupplier } from "./manage-actions";

export const metadata = { title: "Kategori & Spek" };

const F = ({ label, name, ...p }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div><label className="label" htmlFor={`${name}-${label}`}>{label}</label><input id={`${name}-${label}`} name={name} className="input" {...p} /></div>
);

export default async function Taxonomy({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requirePermission("taxonomy.manage");
  const edit = can(me.role, "taxonomy.edit"); // ubah: Owner dan Developer
  const manage = can(me.role, "data.manage"); // hapus: hanya Admin/Developer
  const { error } = await searchParams;
  const [categories, brands, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { nameId: "asc" }, include: { specs: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } } }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Kategori, merk, supplier & spek</h1>
      {error && <p role="alert" className="card p-4 text-sm font-medium text-[var(--color-danger-600)]">{error.slice(0, 200)}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={addCategory} className="card space-y-3 p-5"><h2 className="font-bold">Tambah kategori</h2><F label="Nama (ID)" name="nameId" required /><F label="Name (EN)" name="nameEn" required /><button className="btn btn-primary">Tambah</button></form>
        <form action={addBrand} className="card space-y-3 p-5"><h2 className="font-bold">Tambah merk</h2><F label="Nama merk" name="name" required /><button className="btn btn-primary">Tambah</button></form>
        <form action={addSupplier} className="card space-y-3 p-5"><h2 className="font-bold">Tambah supplier</h2><F label="Nama" name="name" required /><F label="No. WhatsApp" name="waNumber" inputMode="tel" /><F label="Catatan" name="notes" /><button className="btn btn-primary">Tambah</button></form>
      </div>

      <form action={addSpec} className="card grid gap-3 p-5 sm:grid-cols-3">
        <h2 className="font-bold sm:col-span-3">Tambah definisi spek (menjadi filter di katalog)</h2>
        <div><label className="label" htmlFor="sp-cat">Kategori</label><select id="sp-cat" name="categoryId" className="input" required>{categories.map((c) => <option key={c.id} value={c.id}>{c.nameId}</option>)}</select></div>
        <F label="Kunci (mis. ram_gb)" name="key" required pattern="[a-z][a-z0-9_]{1,39}" />
        <div><label className="label" htmlFor="sp-type">Tipe</label><select id="sp-type" name="type" className="input"><option value="NUMBER">Angka (rentang)</option><option value="ENUM">Pilihan</option><option value="BOOLEAN">Ya/Tidak</option></select></div>
        <F label="Label (ID)" name="labelId" required /><F label="Label (EN)" name="labelEn" required /><F label="Satuan (GB, inci…)" name="unit" />
        <div className="sm:col-span-3"><F label="Opsi (khusus tipe Pilihan, pisahkan koma)" name="options" placeholder="i3, i5, i7, Ryzen 5" /></div>
        <button className="btn btn-primary sm:col-span-3 sm:w-fit">Tambah spek</button>
      </form>

      {edit && !manage && <p className="muted text-sm">Anda dapat mengubah data di halaman ini. Menghapus hanya bisa dilakukan oleh Admin/Developer.</p>}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Kategori & spek</h2>
          <ul className="mt-3 space-y-5 text-sm">
            {categories.length === 0 && <li className="muted">Belum ada.</li>}
            {categories.map((c) => (
              <li key={c.id}>
                <p className="font-semibold">{c.nameId} <span className="muted font-normal">/ {c.nameEn} · {c.slug} · {c._count.products} produk</span></p>
                {edit && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs underline">Ubah / hapus kategori</summary>
                    <form action={updateCategory} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="nameId" className="input" defaultValue={c.nameId} required aria-label="Nama (ID)" />
                      <input name="nameEn" className="input" defaultValue={c.nameEn} required aria-label="Name (EN)" />
                      <button className="btn btn-primary">Simpan</button>
                    </form>
                    {manage && <form action={deleteCategory} className="mt-2"><input type="hidden" name="id" value={c.id} /><ConfirmButton message={`Hapus kategori “${c.nameId}” beserta definisi spek-nya? Tindakan ini tidak bisa dibatalkan.`}>Hapus kategori</ConfirmButton></form>}
                  </details>
                )}
                <ul className="muted mt-2 space-y-1 text-xs">
                  {c.specs.map((sp) => (
                    <li key={sp.id}>
                      <code>{sp.key}</code> — {sp.labelId} ({sp.type}{sp.unit ? `, ${sp.unit}` : ""}{sp.options.length ? `: ${sp.options.join("/")}` : ""})
                      {edit && (
                        <details className="mt-1 ml-3">
                          <summary className="cursor-pointer underline">ubah / hapus</summary>
                          <form action={updateSpec} className="mt-2 grid gap-2 sm:grid-cols-2">
                            <input type="hidden" name="id" value={sp.id} />
                            <input name="labelId" className="input" defaultValue={sp.labelId} required aria-label="Label (ID)" />
                            <input name="labelEn" className="input" defaultValue={sp.labelEn} required aria-label="Label (EN)" />
                            <input name="unit" className="input" defaultValue={sp.unit ?? ""} placeholder="Satuan" aria-label="Satuan" />
                            {sp.type === "ENUM" && <input name="options" className="input" defaultValue={sp.options.join(", ")} placeholder="Opsi dipisah koma" aria-label="Opsi" />}
                            <button className="btn btn-primary sm:w-fit">Simpan</button>
                          </form>
                          <p className="mt-1">Kunci dan tipe tidak bisa diubah agar data produk tetap valid.</p>
                          {manage && <form action={deleteSpec} className="mt-1"><input type="hidden" name="id" value={sp.id} /><ConfirmButton message={`Hapus spek “${sp.key}”? Filter di katalog untuk spek ini akan hilang.`}>Hapus spek</ConfirmButton></form>}
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-bold">Merk</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {brands.length === 0 && <li className="muted">Belum ada.</li>}
              {brands.map((b) => (
                <li key={b.id}>
                  {b.name} <span className="muted text-xs">· {b._count.products} produk</span>
                  {edit && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs underline">ubah / hapus</summary>
                      <form action={updateBrand} className="mt-2 flex gap-2"><input type="hidden" name="id" value={b.id} /><input name="name" className="input" defaultValue={b.name} required aria-label="Nama merk" /><button className="btn btn-primary">Simpan</button></form>
                      {manage && <form action={deleteBrand} className="mt-2"><input type="hidden" name="id" value={b.id} /><ConfirmButton message={`Hapus merk “${b.name}”?`}>Hapus merk</ConfirmButton></form>}
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="font-bold">Supplier</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {suppliers.length === 0 && <li className="muted">Belum ada.</li>}
              {suppliers.map((sp) => (
                <li key={sp.id}>
                  {sp.name}{sp.waNumber ? <span className="muted"> · {sp.waNumber}</span> : ""}
                  {edit && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs underline">ubah / hapus</summary>
                      <form action={updateSupplier} className="mt-2 grid gap-2">
                        <input type="hidden" name="id" value={sp.id} />
                        <input name="name" className="input" defaultValue={sp.name} required aria-label="Nama supplier" />
                        <input name="waNumber" className="input" defaultValue={sp.waNumber ?? ""} inputMode="tel" placeholder="No. WhatsApp" aria-label="No. WhatsApp" />
                        <input name="notes" className="input" defaultValue={sp.notes ?? ""} placeholder="Catatan" aria-label="Catatan" />
                        <button className="btn btn-primary sm:w-fit">Simpan</button>
                      </form>
                      {manage && <form action={deleteSupplier} className="mt-2"><input type="hidden" name="id" value={sp.id} /><ConfirmButton message={`Hapus supplier “${sp.name}”? Produk terkait menjadi “tanpa supplier”.`}>Hapus supplier</ConfirmButton></form>}
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
