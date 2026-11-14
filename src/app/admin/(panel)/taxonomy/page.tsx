import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin";
import { addBrand, addCategory, addSpec, addSupplier } from "./actions";

export const metadata = { title: "Kategori & Spek" };

const F = ({ label, name, ...p }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div><label className="label" htmlFor={`${name}-${label}`}>{label}</label><input id={`${name}-${label}`} name={name} className="input" {...p} /></div>
);

export default async function Taxonomy({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("taxonomy.manage");
  const { error } = await searchParams;
  const [categories, brands, suppliers] = await Promise.all([
    db.category.findMany({ orderBy: { nameId: "asc" }, include: { specs: { orderBy: { sortOrder: "asc" } } } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Kategori & spek</h2>
          <ul className="mt-3 space-y-4 text-sm">
            {categories.length === 0 && <li className="muted">Belum ada.</li>}
            {categories.map((c) => (
              <li key={c.id}>
                <p className="font-semibold">{c.nameId} <span className="muted font-normal">/ {c.nameEn} · {c.slug}</span></p>
                <ul className="muted mt-1 list-inside list-disc text-xs">{c.specs.map((s) => <li key={s.id}><code>{s.key}</code> — {s.labelId} ({s.type}{s.unit ? `, ${s.unit}` : ""}{s.options.length ? `: ${s.options.join("/")}` : ""})</li>)}</ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <div className="card p-5"><h2 className="font-bold">Merk</h2><p className="muted mt-3 text-sm">{brands.map((b) => b.name).join(", ") || "Belum ada."}</p></div>
          <div className="card p-5"><h2 className="font-bold">Supplier</h2><ul className="muted mt-3 text-sm">{suppliers.map((s) => <li key={s.id}>{s.name}{s.waNumber ? ` · ${s.waNumber}` : ""}</li>)}{suppliers.length === 0 && <li>Belum ada.</li>}</ul></div>
        </div>
      </section>
    </div>
  );
}
