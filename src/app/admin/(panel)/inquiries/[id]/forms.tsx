"use client";

import { useActionState, useState } from "react";
import { saveOrder, updateInquiry, type ActionState } from "../actions";

const STATUS_OPTIONS: Array<[string, string]> = [
  ["NEW", "Baru"], ["CONTACTED", "Dihubungi"], ["SUPPLIER_CHECKING", "Cek supplier"], ["QUOTED", "Penawaran terkirim"], ["AWAITING_PAYMENT", "Menunggu bayar"],
  ["PAID", "Lunas"], ["PROCURING", "Pesan ke supplier"], ["RECEIVED_BY_US", "Diterima (QC)"], ["SHIPPED", "Dikirim"], ["DELIVERED", "Selesai"], ["CANCELLED", "Batal"], ["EXPIRED", "Kedaluwarsa"],
];

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="text-sm font-medium text-[var(--color-danger-600)]">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm font-medium text-[var(--color-success-600)]">Tersimpan.</p>;
  return null;
}

export function UpdateForm(p: { allowedStatuses: string[]; id: string; updatedAt: string; status: string; quotedPrice: number | null; internalNote: string | null; followUpAt: string; validHours: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateInquiry, {});
  return (
    <form action={action} className="card space-y-4 p-5">
      <h2 className="font-bold">Status & penawaran</h2>
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="expectedUpdatedAt" value={p.updatedAt} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <p className="muted mb-1 text-xs">Menunggu bayar, Lunas, Dikirim, dan Selesai berubah otomatis dari form Order.</p>
          <select id="status" name="status" className="input" defaultValue={p.status}>{STATUS_OPTIONS.filter(([v]) => p.allowedStatuses.includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        <div>
          <label className="label" htmlFor="quotedPrice">Harga final ke customer (Rp)</label>
          <input id="quotedPrice" name="quotedPrice" type="number" min={0} step={1000} className="input" defaultValue={p.quotedPrice ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="quoteValidHours">Harga berlaku (jam)</label>
          <input id="quoteValidHours" name="quoteValidHours" type="number" min={1} max={168} className="input" defaultValue={p.validHours} />
        </div>
        <div>
          <label className="label" htmlFor="followUpAt">Jadwal follow-up (WIB)</label>
          <input id="followUpAt" name="followUpAt" type="datetime-local" className="input" defaultValue={p.followUpAt} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="internalNote">Catatan internal</label>
        <textarea id="internalNote" name="internalNote" rows={3} maxLength={2000} className="input" defaultValue={p.internalNote ?? ""} />
      </div>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Menyimpan…" : "Simpan"}</button>
    </form>
  );
}

type Method = "OWN_TEAM" | "COURIER";

export function OrderForm(p: {
  inquiryId: string; itemPrice: number; itemCost: number; shippingFee: number; insuranceFee: number; paymentFee: number;
  paymentMethod: string; paid: boolean; deliveryMethod: Method; deliveredBy: string; deliveryNote: string;
  courier: string; trackingNumber: string; dispatched: boolean; delivered: boolean; shippingHint: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveOrder, {});
  const [method, setMethod] = useState<Method>(p.deliveryMethod);
  const own = method === "OWN_TEAM";

  const num = (name: string, label: string, value: number, hint?: string) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} className="input" defaultValue={value} required />
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );

  const option = (value: Method, title: string, desc: string) => (
    <label className={`card flex cursor-pointer items-start gap-3 p-4 text-sm ${method === value ? "ring-2 ring-[var(--color-brand-500)]" : ""}`}>
      <input type="radio" name="deliveryMethod" value={value} checked={method === value} onChange={() => setMethod(value)} className="mt-1 size-4" />
      <span><span className="block font-semibold">{title}</span><span className="muted block text-xs">{desc}</span></span>
    </label>
  );

  return (
    <form action={action} className="card space-y-5 p-5">
      <h2 className="font-bold">Order, pembayaran & pengiriman</h2>
      <input type="hidden" name="inquiryId" value={p.inquiryId} />

      <fieldset className="space-y-3">
        <legend className="label">Cara pengiriman ke customer</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {option("OWN_TEAM", "Diantar tim kami", "Petugas kami mengantar langsung. Pembayaran boleh saat serah terima.")}
          {option("COURIER", "Via kurir", "Dikirim lewat kurir. Wajib lunas sebelum dikirim.")}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {num("itemPrice", "Harga jual barang (Rp)", p.itemPrice)}
        {num("itemCost", "Modal aktual (Rp)", p.itemCost, "Bisa beda dari modal katalog (mis. nego supplier).")}
        {num("shippingFee", own ? "Ongkos antar ke customer (Rp)" : "Ongkir kurir ke customer (Rp)", p.shippingFee, p.shippingHint)}
        {num("insuranceFee", "Asuransi (Rp)", p.insuranceFee, own ? "Biasanya 0 untuk antar tim." : undefined)}
        {num("paymentFee", "Biaya pembayaran ditanggung toko (Rp)", p.paymentFee, "Mengurangi laba (mis. biaya VA/QRIS).")}
        <div>
          <label className="label" htmlFor="paymentMethod">Metode bayar</label>
          <select id="paymentMethod" name="paymentMethod" className="input" defaultValue={p.paymentMethod}>
            <option value="">—</option><option value="BANK_TRANSFER">Transfer bank</option><option value="VIRTUAL_ACCOUNT">Virtual account</option><option value="QRIS">QRIS</option>
          </select>
        </div>

        {own ? (
          <div>
            <label className="label" htmlFor="deliveredBy">Petugas pengantar</label>
            <input id="deliveredBy" name="deliveredBy" className="input" maxLength={60} defaultValue={p.deliveredBy} placeholder="Nama anggota tim" />
          </div>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="courier">Kurir</label>
              <input id="courier" name="courier" className="input" maxLength={40} defaultValue={p.courier} placeholder="JNE, SiCepat, Gojek, dll." />
            </div>
            <div>
              <label className="label" htmlFor="trackingNumber">No. resi</label>
              <input id="trackingNumber" name="trackingNumber" className="input" maxLength={60} defaultValue={p.trackingNumber} />
              <p className="muted mt-1 text-xs">Mengisi resi otomatis menandai barang sudah dikirim.</p>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="label" htmlFor="deliveryNote">Alamat lengkap & catatan pengantaran</label>
        <textarea id="deliveryNote" name="deliveryNote" rows={3} maxLength={500} className="input" defaultValue={p.deliveryNote} placeholder="Alamat, patokan, jadwal antar yang disepakati" />
        <p className="muted mt-1 text-xs">Hanya terlihat oleh Owner dan Developer.</p>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="paid" value="1" defaultChecked={p.paid} className="size-4" /> Pembayaran sudah diterima dan diverifikasi</label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="dispatched" value="1" defaultChecked={p.dispatched} className="size-4" /> {own ? "Barang sedang diantar petugas" : "Barang sudah diserahkan ke kurir"}</label>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="delivered" value="1" defaultChecked={p.delivered} className="size-4" /> Barang sudah diterima customer (order selesai)</label>
      </div>
      <Feedback state={state} />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Menyimpan…" : "Simpan order"}</button>
    </form>
  );
}
