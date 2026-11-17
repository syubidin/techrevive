import Link from "next/link";
import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/admin";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmButton } from "../../confirm-button";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Icon } from "@/components/icons";
import { LogoField } from "@/components/logo-field";
import { deliveryUrl } from "@/lib/cloudinary-url";
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

const del = "btn btn-ghost btn-sm text-[var(--color-danger-600)]";
const TYPE = { NUMBER: "Angka", ENUM: "Pilihan", BOOLEAN: "Ya/Tidak" } as const;

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
  const td = "p-3";
  const Actions = ({ children }: { children: React.ReactNode }) => <td className="p-3"><div className="flex justify-end gap-2">{children}</div></td>;
  const Add = ({ label, children }: { label: string; children: React.ReactNode }) => <FormDialog label={label} title={label} icon="plus" variant="primary">{children}</FormDialog>;

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
          <div className="flex justify-end"><Add label="Tambah kategori"><form action={addCategory} className="grid gap-3"><F label="Nama (ID)" name="nameId" required /><F label="Name (EN)" name="nameEn" required /><button className="btn btn-primary w-fit">Tambah</button></form></Add></div>
          <DataTable heads={["Nama (ID)", "Name (EN)", "Produk", "Spek", "Aksi"]} min="34rem" empty="Belum ada kategori.">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-semibold`}>{c.nameId}</td><td className={`${td} muted`}>{c.nameEn}</td><td className={td}>{c._count.products}</td><td className={td}>{c.specs.length}</td>
                <Actions>
                  {edit && <FormDialog label="Edit" title={`Edit kategori`} icon="pencil">
                    <form action={updateCategory} className="grid gap-3"><input type="hidden" name="id" value={c.id} />
                      <div><label className="label">Nama (ID)</label><input name="nameId" className="input" defaultValue={c.nameId} required /></div>
                      <div><label className="label">Name (EN)</label><input name="nameEn" className="input" defaultValue={c.nameEn} required /></div>
                      <button className="btn btn-primary w-fit">Simpan perubahan</button></form>
                  </FormDialog>}
                  {manage && <form action={deleteCategory}><input type="hidden" name="id" value={c.id} /><ConfirmButton className={del} message={`Hapus kategori “${c.nameId}” beserta definisi spek-nya? Tindakan ini tidak bisa dibatalkan.`}><Icon name="trash" size={14} />Hapus</ConfirmButton></form>}
                </Actions>
              </tr>
            ))}
          </DataTable>
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
              <div className="flex justify-end">
                <Add label={`Tambah spek`}>
                  <form action={addSpec} className="grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="categoryId" value={cat.id} />
                    <F label="Kunci (mis. ram_gb)" name="key" required pattern="[a-z][a-z0-9_]{1,39}" />
                    <div><label className="label" htmlFor="sp-type">Tipe</label><select id="sp-type" name="type" className="input"><option value="NUMBER">Angka (rentang)</option><option value="ENUM">Pilihan</option><option value="BOOLEAN">Ya/Tidak</option></select></div>
                    <F label="Label (ID)" name="labelId" required /><F label="Label (EN)" name="labelEn" required />
                    <F label="Satuan (GB, inci…)" name="unit" />
                    <div className="sm:col-span-2"><F label="Opsi (khusus tipe Pilihan, pisahkan koma)" name="options" placeholder="i3, i5, i7, Ryzen 5" /></div>
                    <button className="btn btn-primary w-fit sm:col-span-2">Tambah spek untuk {cat.nameId}</button>
                  </form>
                </Add>
              </div>
              <DataTable heads={["Label", "Kunci", "Tipe", "Satuan", "Opsi", "Aksi"]} min="44rem" empty={`Belum ada spek untuk ${cat.nameId}.`}>
                {cat.specs.map((s) => (
                  <tr key={s.id}>
                    <td className={`${td} font-semibold`}>{s.labelId}<span className="muted block text-xs font-normal">{s.labelEn}</span></td>
                    <td className={td}><code className="text-xs">{s.key}</code></td><td className={td}>{TYPE[s.type]}</td><td className={`${td} muted`}>{s.unit ?? "-"}</td>
                    <td className={`${td} muted max-w-[14rem] text-xs`}>{s.options.length ? s.options.join(", ") : "-"}</td>
                    <Actions>
                      {edit && <FormDialog label="Edit" title={`Edit spek ${s.key}`} icon="pencil">
                        <form action={updateSpec} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="id" value={s.id} />
                          <div><label className="label">Label (ID)</label><input name="labelId" className="input" defaultValue={s.labelId} required /></div>
                          <div><label className="label">Label (EN)</label><input name="labelEn" className="input" defaultValue={s.labelEn} required /></div>
                          <div><label className="label">Satuan</label><input name="unit" className="input" defaultValue={s.unit ?? ""} /></div>
                          {s.type === "ENUM" && <div><label className="label">Opsi (pisahkan koma)</label><input name="options" className="input" defaultValue={s.options.join(", ")} /></div>}
                          <p className="muted text-xs sm:col-span-2">Kunci dan tipe tidak bisa diubah agar data produk tetap valid.</p>
                          <button className="btn btn-primary w-fit sm:col-span-2">Simpan perubahan</button></form>
                      </FormDialog>}
                      {manage && <form action={deleteSpec}><input type="hidden" name="id" value={s.id} /><ConfirmButton className={del} message={`Hapus spek “${s.key}”? Filter di katalog untuk spek ini akan hilang.`}><Icon name="trash" size={14} />Hapus</ConfirmButton></form>}
                    </Actions>
                  </tr>
                ))}
              </DataTable>
            </>
          ) : <p className="muted text-sm">Buat kategori dulu.</p>}
        </>
      )}

      {tab === "merk" && (
        <>
          <div className="flex justify-end"><Add label="Tambah merk"><form action={addBrand} className="grid gap-3"><F label="Nama merk" name="name" required /><LogoField /><button className="btn btn-primary w-fit">Tambah</button></form></Add></div>
          <DataTable heads={["Logo", "Merk", "Produk", "Aksi"]} min="30rem" empty="Belum ada merk.">
            {brands.map((b) => (
              <tr key={b.id}>
                <td className={td}><div className="logo-checker grid h-10 w-24 place-items-center overflow-hidden rounded-lg border border-[var(--line)]">{b.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={deliveryUrl(b.logoUrl, "c_fit,w_192,h_80")} alt="" className="h-full w-full object-contain p-1" /> : <span className="muted text-[10px]">Tanpa logo</span>}</div></td>
                <td className={`${td} font-semibold`}>{b.name}</td><td className={td}>{b._count.products}</td>
                <Actions>
                  {edit && <FormDialog label="Edit" title="Edit merk" icon="pencil"><form action={updateBrand} className="grid gap-3"><input type="hidden" name="id" value={b.id} /><div><label className="label">Nama merk</label><input name="name" className="input" defaultValue={b.name} required /></div><LogoField defaultUrl={b.logoUrl ?? ""} /><button className="btn btn-primary w-fit">Simpan perubahan</button></form></FormDialog>}
                  {manage && <form action={deleteBrand}><input type="hidden" name="id" value={b.id} /><ConfirmButton className={del} message={`Hapus merk “${b.name}”?`}><Icon name="trash" size={14} />Hapus</ConfirmButton></form>}
                </Actions>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {tab === "supplier" && (
        <>
          <div className="flex justify-end"><Add label="Tambah supplier"><form action={addSupplier} className="grid gap-3"><F label="Nama" name="name" required /><F label="No. WhatsApp" name="waNumber" inputMode="tel" /><F label="Catatan" name="notes" /><button className="btn btn-primary w-fit">Tambah</button></form></Add></div>
          <DataTable heads={["Supplier", "WhatsApp", "Catatan", "Aksi"]} min="36rem" empty="Belum ada supplier.">
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className={`${td} font-semibold`}>{s.name}</td><td className={`${td} muted`}>{s.waNumber ?? "-"}</td><td className={`${td} muted max-w-[16rem] truncate`}>{s.notes ?? "-"}</td>
                <Actions>
                  {edit && <FormDialog label="Edit" title="Edit supplier" icon="pencil">
                    <form action={updateSupplier} className="grid gap-3"><input type="hidden" name="id" value={s.id} />
                      <div><label className="label">Nama</label><input name="name" className="input" defaultValue={s.name} required /></div>
                      <div><label className="label">No. WhatsApp</label><input name="waNumber" className="input" defaultValue={s.waNumber ?? ""} inputMode="tel" /></div>
                      <div><label className="label">Catatan</label><input name="notes" className="input" defaultValue={s.notes ?? ""} /></div>
                      <button className="btn btn-primary w-fit">Simpan perubahan</button></form>
                  </FormDialog>}
                  {manage && <form action={deleteSupplier}><input type="hidden" name="id" value={s.id} /><ConfirmButton className={del} message={`Hapus supplier “${s.name}”? Produk terkait menjadi “tanpa supplier”.`}><Icon name="trash" size={14} />Hapus</ConfirmButton></form>}
                </Actions>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </div>
  );
}
