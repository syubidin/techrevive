"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { importProducts, type ImportState } from "./actions";

const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importProducts, {});
  const s = state.summary;
  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="imp-file">File CSV atau Excel (.xlsx), maks. 2 MB</label>
          <input id="imp-file" name="file" type="file" required accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="input !py-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold" />
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="checkOnly" className="mt-1 h-4 w-4" />
          <span>Hanya periksa dulu (tidak menyimpan apa pun). Cocok untuk mencoba file baru.</span>
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary">
          <Icon name={pending ? "refresh" : "upload"} size={18} className={pending ? "animate-spin" : ""} />
          {pending ? "Memproses…" : "Unggah dan impor"}
        </button>
      </form>

      {state.error && <p role="alert" className="card border-[var(--color-danger-600)] p-4 text-sm text-[var(--color-danger-600)]">{state.error}</p>}

      {state.errors && state.errors.length > 0 && (
        <div className="card overflow-hidden" role="alert">
          <p className="border-b border-[var(--line)] p-4 font-semibold text-[var(--color-danger-600)]">Tidak ada produk yang disimpan. Perbaiki {state.errors.length} kesalahan berikut lalu unggah ulang.</p>
          <ul className="max-h-80 divide-y divide-[var(--line)] overflow-auto text-sm">
            {state.errors.map((e, i) => (
              <li key={i} className="flex gap-3 px-4 py-2.5"><span className="chip shrink-0">Baris {e.row}</span><span>{e.message}</span></li>
            ))}
          </ul>
        </div>
      )}

      {s && (
        <div className="card space-y-3 p-5" role="status">
          <p className="flex items-center gap-2 font-bold"><Icon name="check" size={18} />{s.checkOnly ? `File valid: ${s.total} produk siap diimpor (belum disimpan).` : `${s.created} produk berhasil ditambahkan sebagai Draft/sesuai kolom status.`}</p>
          {(s.newBrands.length > 0 || s.newSuppliers.length > 0) && <p className="muted text-sm">{s.newBrands.length > 0 && <>Merk baru: {s.newBrands.join(", ")}. </>}{s.newSuppliers.length > 0 && <>Supplier baru: {s.newSuppliers.join(", ")}.</>}</p>}
          <ul className="divide-y divide-[var(--line)] text-sm">
            {s.preview.map((p) => <li key={p.row} className="flex justify-between gap-3 py-2"><span className="truncate">{p.name}</span><span className="shrink-0 font-semibold">{idr(p.price)}</span></li>)}
          </ul>
          {s.total > s.preview.length && <p className="muted text-xs">dan {s.total - s.preview.length} produk lainnya.</p>}
        </div>
      )}
    </div>
  );
}
