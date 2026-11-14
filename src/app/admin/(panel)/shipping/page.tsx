import { db } from "@/lib/db";
import { requirePermission } from "@/lib/admin";
import { JABODETABEK_CITIES } from "@/lib/shipping";
import { saveRate } from "./actions";

export const metadata = { title: "Ongkir" };

function RateForm({ r }: { r?: { id: string; zone: string; cities: string[]; baseFee: number; perKgFee: number; minDays: number; maxDays: number; isActive: boolean } }) {
  const n = (name: string, label: string, v: number) => (
    <div><label className="label" htmlFor={`${name}-${r?.id ?? "new"}`}>{label}</label><input id={`${name}-${r?.id ?? "new"}`} name={name} type="number" min={0} required className="input" defaultValue={v} /></div>
  );
  return (
    <form action={saveRate} className="card grid gap-3 p-5 sm:grid-cols-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <div className="sm:col-span-2"><label className="label" htmlFor={`zone-${r?.id ?? "new"}`}>Nama zona</label><input id={`zone-${r?.id ?? "new"}`} name="zone" required className="input" defaultValue={r?.zone ?? ""} maxLength={40} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={`cities-${r?.id ?? "new"}`}>Kota (pisahkan koma)</label><input id={`cities-${r?.id ?? "new"}`} name="cities" required className="input" defaultValue={r?.cities.join(", ") ?? ""} /></div>
      {n("baseFee", "1 kg pertama (Rp)", r?.baseFee ?? 20000)}
      {n("perKgFee", "Per kg berikutnya (Rp)", r?.perKgFee ?? 6000)}
      {n("minDays", "Estimasi min (hari)", r?.minDays ?? 1)}
      {n("maxDays", "Estimasi maks (hari)", r?.maxDays ?? 3)}
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="isActive" value="1" defaultChecked={r?.isActive ?? true} className="size-4" /> Aktif</label>
      <button className="btn btn-primary">{r ? "Simpan" : "Tambah zona"}</button>
    </form>
  );
}

export default async function Shipping({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("shipping.manage");
  const { error } = await searchParams;
  const rates = await db.shippingRate.findMany({ orderBy: { zone: "asc" } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Tarif ongkir Jabodetabek</h1>
      <p className="muted text-sm">Berat tertagih = yang terbesar antara berat asli dan volumetrik, dibulatkan ke atas per kg. Kota tersedia: {JABODETABEK_CITIES.join(", ")}. Untuk lokasi di luar daftar, isi ongkir manual di detail inquiry.</p>
      {error && <p role="alert" className="card p-4 text-sm font-medium text-[var(--color-danger-600)]">{error.slice(0, 200)}</p>}
      {rates.map((r) => <RateForm key={r.id} r={r} />)}
      <h2 className="pt-4 font-bold">Tambah zona baru</h2>
      <RateForm />
    </div>
  );
}
