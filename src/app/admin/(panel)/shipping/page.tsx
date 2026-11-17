import { db } from "@/lib/db";
import { can, requirePermission } from "@/lib/admin";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmButton } from "../../confirm-button";
import { DataTable } from "@/components/data-table";
import { FormDialog } from "@/components/form-dialog";
import { Icon } from "@/components/icons";
import { JABODETABEK_CITIES } from "@/lib/shipping";
import { deleteRate, saveRate } from "./actions";

export const metadata = { title: "Ongkir" };

function RateForm({ r }: { r?: { id: string; zone: string; cities: string[]; baseFee: number; perKgFee: number; minDays: number; maxDays: number; isActive: boolean } }) {
  const n = (name: string, label: string, v: number) => (
    <div><label className="label" htmlFor={`${name}-${r?.id ?? "new"}`}>{label}</label><input id={`${name}-${r?.id ?? "new"}`} name={name} type="number" min={0} required className="input" defaultValue={v} /></div>
  );
  return (
    <form action={saveRate} className="grid gap-3 sm:grid-cols-4">
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
  const me = await requirePermission("shipping.manage");
  const manage = can(me.role, "data.manage");
  const { error } = await searchParams;
  const rates = await db.shippingRate.findMany({ orderBy: { zone: "asc" } });
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Tarif ongkir Jabodetabek" icon="truck" />
      <p className="muted text-sm">Berat tertagih = yang terbesar antara berat asli dan volumetrik, dibulatkan ke atas per kg. Kota tersedia: {JABODETABEK_CITIES.join(", ")}. Di luar daftar, isi ongkir manual saat membuat pesanan.</p>
      <AdminAlert message={error} />
      <div className="flex justify-end"><FormDialog label="Tambah zona" title="Tambah zona baru" icon="plus" variant="primary" size="md"><RateForm /></FormDialog></div>
      <DataTable heads={["Zona", "Kota", "Tarif", "Estimasi", "Status", "Aksi"]} min="48rem" empty="Belum ada zona ongkir.">
        {rates.map((r) => (
          <tr key={r.id}>
            <td className="p-3 font-semibold">{r.zone}</td>
            <td className="muted max-w-[16rem] p-3 text-xs">{r.cities.join(", ")}</td>
            <td className="whitespace-nowrap p-3">Rp{r.baseFee.toLocaleString("id-ID")}<span className="muted block text-xs">+ Rp{r.perKgFee.toLocaleString("id-ID")}/kg</span></td>
            <td className="whitespace-nowrap p-3">{r.minDays}-{r.maxDays} hari</td>
            <td className="p-3"><span className={`chip ${r.isActive ? "chip-tone-ok" : "chip-tone-mute"}`}>{r.isActive ? "Aktif" : "Nonaktif"}</span></td>
            <td className="p-3">
              <div className="flex justify-end gap-2">
                <FormDialog label="Edit" title={`Edit zona ${r.zone}`} icon="pencil"><RateForm r={r} /></FormDialog>
                {manage && <form action={deleteRate}><input type="hidden" name="id" value={r.id} /><ConfirmButton message={`Hapus zona “${r.zone}”? Inquiry lama tidak terpengaruh.`}><Icon name="trash" size={14} />Hapus</ConfirmButton></form>}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
