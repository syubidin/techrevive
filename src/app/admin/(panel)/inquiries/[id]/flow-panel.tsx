"use client";

import { useActionState, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { ConfirmButton } from "../../../confirm-button";
import { createOrder, markDelivered, markPaid, markShipped, quickStatus, saveNote, sendQuote, type ActionState } from "../actions";
import { STEP_COPY, type StepKey } from "@/lib/next-step";

export interface FlowDefaults {
  quotedPrice: number;
  validHours: number;
  itemPrice: number;
  shippingFee: number;
  insuranceFee: number;
  shippingHint: string;
  total: number | null;
  paymentMethod: string;
  paymentFee: number;
  deliveryMethod: "OWN_TEAM" | "COURIER";
  deliveredBy: string;
  courier: string;
  trackingNumber: string;
  deliveryNote: string;
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="flex gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><Icon name="alert" size={18} className="mt-0.5 shrink-0" />{state.error}</p>;
  if (state.ok) return <p role="status" className="flex gap-2 text-sm font-medium text-[var(--color-success-600)]"><Icon name="circle-check" size={18} />Tersimpan.</p>;
  return null;
}

function Submit({ pending, icon, children }: { pending: boolean; icon: IconName; children: React.ReactNode }) {
  return <button className="btn btn-primary" disabled={pending}><Icon name={pending ? "refresh" : icon} size={18} className={pending ? "animate-spin" : ""} />{pending ? "Menyimpan…" : children}</button>;
}

function Num({ name, label, value, hint, required = true }: { name: string; label: string; value: number | string; hint?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} className="input" defaultValue={value} required={required} inputMode="numeric" />
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function QuoteForm({ id, d }: { id: string; d: FlowDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(sendQuote, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="inquiryId" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Num name="quotedPrice" label="Harga final ke customer (Rp)" value={d.quotedPrice || ""} />
        <Num name="quoteValidHours" label="Harga berlaku (jam)" value={d.validHours} />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} icon="receipt">Kirim penawaran</Submit>
    </form>
  );
}

function OrderStart({ id, d }: { id: string; d: FlowDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createOrder, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="inquiryId" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Num name="itemPrice" label="Harga jual barang (Rp)" value={d.itemPrice} />
        <Num name="shippingFee" label="Ongkos kirim / antar (Rp)" value={d.shippingFee} hint={d.shippingHint} />
      </div>
      <input type="hidden" name="insuranceFee" value={d.insuranceFee} />
      <Feedback state={state} />
      <Submit pending={pending} icon="check">Buat pesanan</Submit>
    </form>
  );
}

function PayForm({ id, d }: { id: string; d: FlowDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markPaid, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="inquiryId" value={id} />
      {d.total != null && <p className="rounded-xl bg-[var(--color-ink-100)] p-3 text-sm dark:bg-[var(--color-ink-800)]">Total tagihan customer: <b>Rp{d.total.toLocaleString("id-ID")}</b></p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="paymentMethod">Metode bayar</label>
          <select id="paymentMethod" name="paymentMethod" className="input" defaultValue={d.paymentMethod || "BANK_TRANSFER"} required>
            <option value="BANK_TRANSFER">Transfer bank</option><option value="VIRTUAL_ACCOUNT">Virtual account</option><option value="QRIS">QRIS</option>
          </select>
        </div>
        <Num name="paymentFee" label="Biaya pembayaran ditanggung toko (Rp)" value={d.paymentFee} hint="Opsional, mengurangi laba (mis. biaya VA/QRIS)." required={false} />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} icon="wallet">Tandai lunas</Submit>
    </form>
  );
}

function ShipForm({ id, d }: { id: string; d: FlowDefaults }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(markShipped, {});
  const [method, setMethod] = useState(d.deliveryMethod);
  const own = method === "OWN_TEAM";
  const opt = (v: "OWN_TEAM" | "COURIER", icon: IconName, title: string, desc: string) => (
    <label className={`card flex cursor-pointer items-start gap-3 p-3 text-sm ${method === v ? "ring-2 ring-[var(--color-brand-500)]" : ""}`}>
      <input type="radio" name="deliveryMethod" value={v} checked={method === v} onChange={() => setMethod(v)} className="mt-1 size-4" />
      <span><span className="flex items-center gap-1.5 font-semibold"><Icon name={icon} size={16} />{title}</span><span className="muted block text-xs">{desc}</span></span>
    </label>
  );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="inquiryId" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        {opt("OWN_TEAM", "truck", "Diantar tim kami", "Bayar boleh saat serah terima.")}
        {opt("COURIER", "package", "Via kurir", "Wajib lunas sebelum dikirim.")}
      </div>
      {own ? (
        <div>
          <label className="label" htmlFor="deliveredBy">Petugas pengantar</label>
          <input id="deliveredBy" name="deliveredBy" className="input" maxLength={60} defaultValue={d.deliveredBy} placeholder="Nama anggota tim" required />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="courier">Kurir</label><input id="courier" name="courier" className="input" maxLength={40} defaultValue={d.courier} placeholder="JNE, SiCepat, Gojek…" required /></div>
          <div><label className="label" htmlFor="trackingNumber">No. resi (opsional)</label><input id="trackingNumber" name="trackingNumber" className="input" maxLength={60} defaultValue={d.trackingNumber} /></div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="deliveryNote">Alamat & catatan pengantaran</label>
        <textarea id="deliveryNote" name="deliveryNote" rows={2} maxLength={500} className="input" defaultValue={d.deliveryNote} placeholder="Alamat, patokan, jadwal" />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} icon="truck">Tandai dikirim</Submit>
    </form>
  );
}

function QuickBtn({ id, target, icon, children, confirm, className = "btn btn-ghost btn-sm" }: { id: string; target: string; icon: IconName; children: React.ReactNode; confirm?: string; className?: string }) {
  return (
    <form action={quickStatus}>
      <input type="hidden" name="inquiryId" value={id} /><input type="hidden" name="target" value={target} />
      {confirm ? <ConfirmButton message={confirm} className={className}><Icon name={icon} size={16} />{children}</ConfirmButton> : <button className={className}><Icon name={icon} size={16} />{children}</button>}
    </form>
  );
}

export function FlowPanel({ id, step, status, canMoney, canFulfil, canOverride, d }: { id: string; step: StepKey; status: string; canMoney: boolean; canFulfil: boolean; canOverride: boolean; d: FlowDefaults }) {
  const copy = STEP_COPY[step];
  const wait = (who: string) => <p className="flex gap-2 rounded-xl bg-[var(--color-ink-100)] p-3 text-sm dark:bg-[var(--color-ink-800)]"><Icon name="info" size={18} className="mt-0.5 shrink-0" />Langkah ini dilakukan oleh {who}.</p>;
  const cancel = <QuickBtn id={id} target="CANCELLED" icon="x" confirm="Batalkan inquiry ini?" className="btn btn-ghost btn-sm text-[var(--color-danger-600)]">Batalkan inquiry</QuickBtn>;

  return (
    <section className="card space-y-4 border-[var(--color-brand-500)] p-5" aria-labelledby="flow-title">
      <div>
        <p className="muted text-xs font-bold uppercase tracking-wider">Langkah berikutnya</p>
        <h2 id="flow-title" className="mt-1 text-lg font-extrabold">{copy.title}</h2>
        <p className="muted mt-1 text-sm">{copy.hint}</p>
      </div>

      {step === "reply" && (
        <>
          <div className="flex flex-wrap gap-2">
            {status === "NEW" && <QuickBtn id={id} target="CONTACTED" icon="phone">Sudah saya hubungi</QuickBtn>}
            {status !== "SUPPLIER_CHECKING" && <QuickBtn id={id} target="SUPPLIER_CHECKING" icon="clock">Sedang cek supplier</QuickBtn>}
          </div>
          <QuoteForm id={id} d={d} />
          <div>{cancel}</div>
        </>
      )}

      {step === "order" && (
        <>
          {canMoney ? <OrderStart id={id} d={d} /> : wait("Owner")}
          <details className="text-sm"><summary className="muted cursor-pointer">Ubah harga penawaran</summary><div className="mt-3"><QuoteForm id={id} d={d} /></div></details>
          <div>{cancel}</div>
        </>
      )}

      {step === "pay" && (
        <>
          {canMoney ? <PayForm id={id} d={d} /> : wait("Owner")}
          <div>{cancel}</div>
        </>
      )}

      {step === "ship" && (
        canFulfil ? (
          <>
            <div className="flex flex-wrap gap-2">
              {status === "PAID" && <QuickBtn id={id} target="PROCURING" icon="package">Sudah dipesan ke supplier</QuickBtn>}
              {status === "PROCURING" && <QuickBtn id={id} target="RECEIVED_BY_US" icon="badge-check">Barang sudah diterima &amp; dicek</QuickBtn>}
            </div>
            <ShipForm id={id} d={d} />
            {canOverride && <div>{cancel}</div>}
          </>
        ) : wait("Owner atau Staff")
      )}

      {step === "deliver" && (
        <>
          <p className="rounded-xl bg-[var(--color-ink-100)] p-3 text-sm dark:bg-[var(--color-ink-800)]">
            {d.deliveryMethod === "OWN_TEAM" ? `Diantar oleh ${d.deliveredBy || "-"}` : `Kurir ${d.courier || "-"}${d.trackingNumber ? ` · resi ${d.trackingNumber}` : ""}`}
          </p>
          {canFulfil && (
            <form action={markDelivered}>
              <input type="hidden" name="inquiryId" value={id} />
              <button className="btn btn-primary"><Icon name="circle-check" size={18} />Tandai selesai (barang diterima)</button>
            </form>
          )}
        </>
      )}

      {step === "closed" && canOverride && <QuickBtn id={id} target="CONTACTED" icon="refresh" confirm="Buka kembali inquiry ini?">Buka kembali</QuickBtn>}
    </section>
  );
}

export function NoteForm({ id, note, followUpAt }: { id: string; note: string; followUpAt: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNote, {});
  return (
    <form action={action} className="card space-y-3 p-5">
      <h2 className="font-bold">Catatan &amp; follow-up</h2>
      <input type="hidden" name="inquiryId" value={id} />
      <div><label className="label" htmlFor="internalNote">Catatan internal</label><textarea id="internalNote" name="internalNote" rows={2} maxLength={2000} className="input" defaultValue={note} /></div>
      <div><label className="label" htmlFor="followUpAt">Ingatkan saya (WIB)</label><input id="followUpAt" name="followUpAt" type="datetime-local" className="input" defaultValue={followUpAt} /></div>
      <Feedback state={state} />
      <button className="btn btn-ghost" disabled={pending}>{pending ? "Menyimpan…" : "Simpan catatan"}</button>
    </form>
  );
}
