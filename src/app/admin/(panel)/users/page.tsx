import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { ROLE_LABEL, ROLES } from "@/lib/rbac";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmButton } from "../../confirm-button";
import { createAdmin, deleteAdmin, resetAdminPassword, revokeAdminSessions, setAdminActive, setAdminRole, updateAdmin } from "./actions";

export const metadata = { title: "Admin & peran" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requirePermission("user.manage");
  const { error } = await searchParams;
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } });
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Admin & peran" icon="users" />
      <AdminAlert message={error} />

      <ul className="grid gap-3 lg:grid-cols-2">
        {users.map((u) => (
          <li key={u.id} className="card space-y-3 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{u.name}</span>
              {u.id === me.id && <span className="chip chip-tone-info">Anda</span>}
              {!u.isActive && <span className="chip chip-tone-mute">Nonaktif</span>}
              <span className="chip ml-auto">{ROLE_LABEL[u.role]}</span>
            </div>
            <p className="muted text-xs">{u.email} · login terakhir {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "belum pernah"}</p>
            {u.id !== me.id && (
              <div className="flex flex-wrap items-center gap-2">
                <form action={setAdminRole} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <label className="sr-only" htmlFor={`role-${u.id}`}>Peran {u.name}</label>
                  <select id={`role-${u.id}`} name="role" className="input !h-9 !w-auto !py-1 text-xs" defaultValue={u.role}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                  <button className="btn btn-ghost btn-sm">Ubah peran</button>
                </form>
                <form action={setAdminActive}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.isActive ? "0" : "1"} /><button className="btn btn-ghost btn-sm">{u.isActive ? "Nonaktifkan" : "Aktifkan"}</button></form>
              </div>
            )}
            <details>
              <summary className="cursor-pointer text-xs font-semibold underline">Kelola akun</summary>
              <div className="mt-3 space-y-3">
                <form action={updateAdmin} className="grid gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="name" className="input" defaultValue={u.name} required aria-label="Nama" />
                  <input name="email" type="email" className="input" defaultValue={u.email} required aria-label="Email" />
                  <button className="btn btn-primary btn-sm sm:w-fit">Simpan profil</button>
                </form>
                <form action={resetAdminPassword} className="grid gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="password" minLength={12} required className="input" placeholder="Kata sandi baru (min. 12)" autoComplete="new-password" aria-label="Kata sandi baru" />
                  <button className="btn btn-ghost btn-sm sm:w-fit">Atur ulang kata sandi</button>
                </form>
                {u.id !== me.id && <form action={revokeAdminSessions}><input type="hidden" name="id" value={u.id} /><button className="btn btn-ghost btn-sm">Putus semua sesi login</button></form>}
                {u.id !== me.id && <form action={deleteAdmin}><input type="hidden" name="id" value={u.id} /><ConfirmButton message={`Hapus akun ${u.email} secara permanen? Jejak audit tetap tersimpan. Untuk berhenti sementara, pilih Nonaktifkan.`}>Hapus akun</ConfirmButton></form>}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <details className="card p-5"><summary className="cursor-pointer font-bold">Tambah akun</summary>
      <form action={createAdmin} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="u-name">Nama</label><input id="u-name" name="name" required className="input" /></div>
        <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" required className="input" autoComplete="off" /></div>
        <div>
          <label className="label" htmlFor="u-role">Peran</label>
          <select id="u-role" name="role" className="input" defaultValue="STAFF">
            <option value="STAFF">Staff (memproses inquiry saja)</option>
            <option value="OWNER">Owner (semua kecuali kelola peran)</option>
            <option value="DEVELOPER">Admin / Developer (kendali penuh)</option>
          </select>
        </div>
        <div><label className="label" htmlFor="u-pass">Kata sandi (min. 12 karakter)</label><input id="u-pass" name="password" type="password" minLength={12} required className="input" autoComplete="new-password" /></div>
        <button className="btn btn-primary sm:w-fit">Tambah</button>
      </form></details>
      <p className="muted text-xs">Mengubah peran, menonaktifkan, atau mengatur ulang kata sandi otomatis memutus semua sesi login akun tersebut. Sistem selalu menyisakan minimal satu Admin/Developer aktif.</p>
    </div>
  );
}
