"use client";

import { useState } from "react";
import { deliveryUrl } from "@/lib/cloudinary-url";
import { Icon } from "./icons";

const MSG: Record<string, string> = {
  NOT_TRANSPARENT: "Logo harus berlatar transparan. Gunakan PNG atau WebP yang transparan (bukan JPG).",
  UNSUPPORTED_TYPE: "Hanya PNG atau WebP transparan.",
  TOO_LARGE: "Maksimal 1 MB.",
  UPLOAD_NOT_CONFIGURED: "Penyimpanan gambar belum diatur.",
  RATE_LIMITED: "Terlalu banyak unggahan, coba lagi nanti.",
  STORAGE_ERROR: "Gagal menyimpan logo ke penyimpanan.",
};

/** Kolom unggah logo merk: pratinjau pada kotak ukuran tetap, wajib transparan, bisa dihapus. Mengisi input tersembunyi `logoUrl`. */
export function LogoField({ defaultUrl = "" }: { defaultUrl?: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMsg("");
    const fd = new FormData(); fd.append("file", file); fd.append("kind", "logo");
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) setMsg(MSG[data.error ?? ""] ?? "Gagal mengunggah.");
      else setUrl(data.url);
    } catch { setMsg("Koneksi gagal."); }
    setBusy(false);
  }

  return (
    <div>
      <span className="label">Logo merk (opsional)</span>
      <input type="hidden" name="logoUrl" value={url} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="logo-checker relative grid h-16 w-40 place-items-center overflow-hidden rounded-xl border border-[var(--line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={deliveryUrl(url, "c_fit,w_320,h_128")} alt="" className="h-full w-full object-contain p-2" /> : <span className="muted text-xs">Belum ada logo</span>}
        </div>
        <div className="flex flex-col gap-2">
          <label className="btn btn-ghost btn-sm cursor-pointer">
            <Icon name={busy ? "refresh" : "upload"} size={14} className={busy ? "animate-spin" : ""} />{busy ? "Mengunggah…" : url ? "Ganti logo" : "Unggah logo"}
            <input type="file" accept="image/png,image/webp" hidden disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {url && <button type="button" className="btn btn-ghost btn-sm" data-no-confirm onClick={() => setUrl("")}><Icon name="trash" size={14} />Hapus logo</button>}
        </div>
      </div>
      <p className="muted mt-2 text-xs" role={msg ? "alert" : undefined}>{msg || "PNG atau WebP berlatar transparan, ideal 600 x 240 px (lebar:tinggi sekitar 5:2), maks. 1 MB. Ditampilkan dalam kotak ukuran sama untuk semua merk."}</p>
    </div>
  );
}
