import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { ROLE_LABEL, ROLES } from "@/lib/rbac";
import { createAdmin, setAdminActive, setAdminRole } from "./actions";

export const metadata = { title: "Admin & peran" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requirePermission("user.manage");
  const { error } = await searchParams;
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Admin & peran</h1>
      {error && <p role="alert" className="card p-4 text-sm font-medium text-[var(--color-danger-600)]">{error.slice(0, 200)}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="muted text-xs uppercase"><tr><th className="p-3">Nama</th><th className="p-3">Email</th><th className="p-3">Peran</th><th className="p-3">Login terakhir</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-semibold">{u.name}{u.id === me.id && <span className="chip ml-2">Anda</span>}{!u.isActive && <span className="chip ml-2">nonaktif</span>}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  {u.id === me.id ? (
                    <span className="chip">{ROLE_LABEL[u.role]}</span>
                  ) : (
                    <form action={setAdminRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Peran {u.name}</label>
                      <select id={`role-${u.id}`} name="role" className="input !w-auto !py-1.5 text-xs" defaultValue={u.role}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <button className="text-xs underline">Ubah</button>
                    </form>
                  )}
                </td>
                <td className="muted p-3">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—"}</td>
                <td className="p-3">
                  {u.id !== me.id && (
                    <form action={setAdminActive}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.isActive ? "0" : "1"} /><button className="text-xs underline">{u.isActive ? "Nonaktifkan" : "Aktifkan"}</button></form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createAdmin} className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Tambah akun</h2>
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
      </form>
      <p className="muted text-sm">Hanya Admin/Developer yang dapat menambah akun dan mengubah peran. Sistem selalu menyisakan minimal satu Admin/Developer aktif.</p>
    </div>
  );
}
