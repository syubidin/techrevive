import { requirePermission } from "@/lib/admin";
import { BackLink } from "@/components/back-link";
import { Icon } from "@/components/icons";
import { COLUMN_HELP, MAX_ROWS, TEMPLATE_COLUMNS } from "@/lib/product-import";
import { ImportForm } from "./import-form";

export const metadata = { title: "Impor produk" };

export default async function ImportPage() {
  await requirePermission("product.manage");
  return (
    <div className="max-w-3xl space-y-6">
      <div><BackLink href="/admin/products">Produk</BackLink><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Impor produk dari CSV / Excel</h1></div>

      <ol className="card grid gap-4 p-5 text-sm sm:grid-cols-3">
        <li className="space-y-1"><span className="chip">1</span><p className="font-semibold">Unduh template</p><p className="muted">Isi satu produk per baris. Hapus 2 baris contoh.</p></li>
        <li className="space-y-1"><span className="chip">2</span><p className="font-semibold">Isi data</p><p className="muted">Kolom bertanda wajib: nama_id, kategori, merk, harga_modal. Sisanya boleh kosong.</p></li>
        <li className="space-y-1"><span className="chip">3</span><p className="font-semibold">Unggah</p><p className="muted">Maks. {MAX_ROWS} produk. Jika ada yang salah, tidak ada yang disimpan.</p></li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <a href="/api/admin/products/template?format=xlsx" className="btn btn-primary btn-sm"><Icon name="download" size={16} />Template Excel (.xlsx)</a>
        <a href="/api/admin/products/template?format=csv" className="btn btn-ghost btn-sm"><Icon name="download" size={16} />Template CSV</a>
      </div>

      <ImportForm />

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Penjelasan semua kolom</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="muted text-xs uppercase"><tr><th className="py-2 pr-3">Kolom</th><th className="py-2 pr-3">Wajib</th><th className="py-2">Isi</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {TEMPLATE_COLUMNS.map((c) => <tr key={c}><td className="py-2 pr-3 font-mono text-xs">{c}</td><td className="py-2 pr-3">{COLUMN_HELP[c].required ? "Ya" : "-"}</td><td className="py-2">{COLUMN_HELP[c].help}{COLUMN_HELP[c].example && <span className="muted"> Contoh: {COLUMN_HELP[c].example}</span>}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p className="muted mt-3 text-xs">Foto: unggah dulu lewat form produk, lalu tempel URL-nya di kolom foto_url. Produk tanpa foto sebaiknya berstatus DRAFT.</p>
      </details>
    </div>
  );
}
