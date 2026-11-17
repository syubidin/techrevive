"use client";

import { useActionState, useState } from "react";
import { computeProfit, computeSellPrice, PricingError } from "@/lib/pricing";
import { site } from "@/config/site";
import { deliveryUrl } from "@/lib/cloudinary-url";
import { Icon } from "@/components/icons";
import { saveProduct, type ProductState } from "./actions";

export interface ProductFormValues {
  id?: string; nameId: string; nameEn: string; descriptionId: string; descriptionEn: string;
  categoryId: string; brandId: string; supplierId: string; condition: string; grade: string; batteryHealth: string;
  attributes: string; features: string; weightGram: number; stockQty: string; costPrice: number; marginType: "PERCENT_BPS" | "FIXED"; marginInput: number;
  availability: string; status: string; images: string;
}
interface Opt { id: string; name: string }

const idr = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

export function ProductForm({ values, categories, brands, suppliers }: { values: ProductFormValues; categories: Opt[]; brands: Opt[]; suppliers: Opt[] }) {
  const [state, action, pending] = useActionState<ProductState, FormData>(saveProduct, {});
  const [cost, setCost] = useState(values.costPrice);
  const [type, setType] = useState(values.marginType);
  const [margin, setMargin] = useState(values.marginInput);
  const [imgText, setImgText] = useState(values.images);
  const imgLines = imgText.split("\n").map((l) => l.trim()).filter(Boolean);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setUploadMsg("");
    const messages: Record<string, string> = {
      UPLOAD_NOT_CONFIGURED: "Penyimpanan gambar belum diatur. Tempel URL manual.", UNSUPPORTED_TYPE: "Hanya JPG, PNG, atau WebP.",
      TOO_LARGE: "Maksimal 5 MB per foto.", RATE_LIMITED: "Terlalu banyak unggahan, coba lagi nanti.", STORAGE_ERROR: "Gagal menyimpan gambar ke penyimpanan.",
    };
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) { setUploadMsg(`${file.name}: ${messages[data.error ?? ""] ?? "Gagal mengunggah."}`); continue; }
        const url = data.url;
        // Foto yang sama (mis. terpilih dua kali) tidak ditambahkan lagi.
        setImgText((cur) => (cur.split("\n").map((l) => l.trim()).includes(url) ? cur : [cur.trim(), url].filter(Boolean).join("\n")));
      } catch { setUploadMsg(`${file.name}: koneksi gagal.`); }
    }
    setUploading(false);
  }

  let preview: { sell: number; profit: number; bps: number } | { error: string };
  try {
    const marginValue = type === "PERCENT_BPS" ? Math.round(margin * 100) : Math.round(margin);
    const sell = computeSellPrice({ costPrice: cost, marginType: type, marginValue });
    const p = computeProfit(sell, cost);
    preview = { sell, profit: p.profit, bps: p.marginBps };
  } catch (e) {
    preview = { error: e instanceof PricingError ? e.message : "Input tidak valid" };
  }
  const low = "sell" in preview && preview.bps < site.minMarginBps;

  const field = (label: string, name: string, defaultValue: string | number, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" defaultValue={defaultValue} {...props} />
    </div>
  );
  const select = (label: string, name: string, defaultValue: string, options: Array<[string, string]>) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} className="input" defaultValue={defaultValue}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <form action={action} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Informasi</h2>
        {field("Nama (Indonesia)", "nameId", values.nameId, { required: true, minLength: 3, maxLength: 140 })}
        {field("Name (English)", "nameEn", values.nameEn, { required: true, minLength: 3, maxLength: 140 })}
        <div><label className="label" htmlFor="descriptionId">Deskripsi (ID)</label><textarea id="descriptionId" name="descriptionId" rows={4} maxLength={4000} className="input" defaultValue={values.descriptionId} /></div>
        <div><label className="label" htmlFor="descriptionEn">Description (EN)</label><textarea id="descriptionEn" name="descriptionEn" rows={4} maxLength={4000} className="input" defaultValue={values.descriptionEn} /></div>
        {select("Kategori", "categoryId", values.categoryId, categories.map((c) => [c.id, c.name]))}
        {select("Merk", "brandId", values.brandId, brands.map((b) => [b.id, b.name]))}
        {select("Supplier", "supplierId", values.supplierId, [["", "— tidak ada —"], ...suppliers.map((s) => [s.id, s.name] as [string, string])])}
        {select("Kondisi", "condition", values.condition, [["REFURBISHED", "Refurbished"], ["USED", "Second"]])}
        {select("Grade", "grade", values.grade, [["", "— belum dinilai —"], ["A", "A — mulus"], ["B", "B — wajar"], ["C", "C — ada cacat"]])}
        {field("Kesehatan baterai (%)", "batteryHealth", values.batteryHealth, { type: "number", min: 0, max: 100 })}
        {field("Berat dengan kemasan (gram)", "weightGram", values.weightGram, { type: "number", min: 50, max: 50000, required: true })}
        <div>
          <label className="label" htmlFor="stockQty">Jumlah unit (opsional)</label>
          <input id="stockQty" name="stockQty" type="number" min={0} max={100000} className="input" defaultValue={values.stockQty} placeholder="Kosongkan bila tidak tahu" />
          <p className="muted mt-1 text-xs">Diisi: stok berkurang otomatis tiap order lunas dan jadi Habis di 0. Kosong: Anda diminta meninjau stok setelah terjual.</p>
        </div>
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="font-bold">Spesifikasi & fitur (dipakai filter customer)</h2>
        <div>
          <label className="label" htmlFor="attributes">Spek, satu baris satu: kunci=nilai</label>
          <textarea id="attributes" name="attributes" rows={5} className="input font-mono text-xs" defaultValue={values.attributes} placeholder={"ram_gb=16\nstorage_gb=512\ncpu_family=i7\ntouchscreen=ya"} />
          <p className="muted mt-1 text-xs">Kunci harus sudah didefinisikan di menu Kategori & Spek untuk kategori produk ini.</p>
        </div>
        {field("Fitur (pisahkan koma)", "features", values.features, { placeholder: "touchscreen, backlit keyboard, fingerprint" })}
        <div>
          <label className="label" htmlFor="images">URL foto unit asli (https, satu per baris, yang pertama jadi foto utama)</label>
          <textarea id="images" name="images" rows={4} className="input font-mono text-xs" value={imgText} onChange={(e) => setImgText(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="btn cursor-pointer">
              {uploading ? "Mengunggah…" : "Unggah foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={uploading} onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
            </label>
            <span className="muted text-xs" role="status">{uploadMsg || "URL otomatis ditambahkan ke daftar, lalu klik Simpan."}</span>
          </div>
          <p className="muted mt-2 text-xs">Ukuran ideal <strong>1200 x 1200 px (persegi 1:1)</strong>, latar polos/putih, JPG atau WebP, maks. 5 MB. Foto non-persegi tetap utuh (tidak dipotong), sisi terpanjang otomatis diperkecil ke 1600 px. Mengunggah file yang sama dua kali tidak menggandakan penyimpanan, dan foto yang dilepas/diganti otomatis dihapus dari penyimpanan saat disimpan.</p>
          {imgLines.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6" aria-label="Pratinjau foto">
              {imgLines.map((u, i) => (
                <li key={u} className="relative">
                  <div className="aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={deliveryUrl(u, "c_fit,w_240,h_240")} alt="" className="h-full w-full object-contain" loading="lazy" />
                  </div>
                  {i === 0 && <span className="chip chip-tone-info absolute left-1 top-1 !min-h-0 !px-1.5 !py-0 !text-[10px]">Utama</span>}
                  <button type="button" data-no-confirm aria-label="Lepas foto ini" onClick={() => setImgText(imgLines.filter((x) => x !== u).join("\n"))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Harga (modal hanya terlihat admin)</h2>
        <div>
          <label className="label" htmlFor="costPrice">Harga modal dari supplier (Rp)</label>
          <input id="costPrice" name="costPrice" type="number" min={1} required className="input" value={cost || ""} onChange={(e) => setCost(Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="marginType">Jenis margin</label>
          <select id="marginType" name="marginType" className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="PERCENT_BPS">Persen (%)</option><option value="FIXED">Nominal tetap (Rp)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="marginInput">{type === "PERCENT_BPS" ? "Margin (%)" : "Margin (Rp)"}</label>
          <input id="marginInput" name="marginInput" type="number" min={0} step={type === "PERCENT_BPS" ? 0.1 : 1000} required className="input" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
        </div>
        <div className="rounded-xl bg-[var(--color-ink-100)] p-4 text-sm dark:bg-[var(--color-ink-800)]" aria-live="polite">
          {"error" in preview ? <p className="text-[var(--color-danger-600)]">{preview.error}</p> : (
            <>
              <p className="muted text-xs uppercase">Harga jual (dibulatkan ke Rp1.000)</p>
              <p className="text-2xl font-extrabold">{idr(preview.sell)}</p>
              <p className="muted">Laba kotor {idr(preview.profit)} · {(preview.bps / 100).toFixed(2)}% dari harga jual</p>
            </>
          )}
        </div>
        {low && (
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-warning-600)] sm:col-span-2">
            <input type="checkbox" name="confirmLowMargin" value="1" className="size-4" /> Margin di bawah {site.minMarginBps / 100}%, saya sengaja menjualnya.
          </label>
        )}
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Ketersediaan & publikasi</h2>
        {select("Ketersediaan", "availability", values.availability, [["CHECK", "Cek ketersediaan"], ["VERIFIED", "Tersedia (terverifikasi)"], ["PREORDER", "Pre-order"], ["SOLD_OUT", "Habis"]])}
        {select("Status", "status", values.status, [["DRAFT", "Draft"], ["PUBLISHED", "Terbit"], ["ARCHIVED", "Arsip"]])}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="reverify" value="1" className="size-4" /> Saya baru saja mengonfirmasi stok ke supplier (perbarui waktu verifikasi)</label>
        <p className="muted text-xs sm:col-span-2">Status “Tersedia” otomatis tampil sebagai “Cek Ketersediaan” bila tidak dikonfirmasi ulang dalam 48 jam.</p>
      </section>

      {state.error && <p role="alert" className="card p-4 text-sm font-medium text-[var(--color-danger-600)]">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending || "error" in preview}>{pending ? "Menyimpan…" : "Simpan produk"}</button>
    </form>
  );
}
