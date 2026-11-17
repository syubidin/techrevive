import { requirePermission } from "@/lib/admin";
import { AdminAlert } from "@/components/admin-alert";
import { BackLink } from "@/components/back-link";
import { PasswordInput } from "@/components/password-input";
import { createAdmin } from "../actions";

export const metadata = { title: "Tambah akun" };

export default async function NewUser({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("user.manage");
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl space-y-5">
      <div><BackLink href="/admin/users">Admin & peran</BackLink><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Tambah akun</h1></div>
      <AdminAlert message={error} />
      <form action={createAdmin} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div><label className="label" htmlFor="u-name">Nama</label><input id="u-name" name="name" required className="input" /></div>
        <div><label className="label" htmlFor="u-email">Email</label><input id="u-email" name="email" type="email" required className="input" autoComplete="off" /></div>
        <div>
          <label className="label" htmlFor="u-role">Peran</label>
          <select id="u-role" name="role" className="input" defaultValue="STAFF">
            <option value="STAFF">Staff (memproses inquiry)</option>
            <option value="OWNER">Owner (semua kecuali kelola peran)</option>
            <option value="DEVELOPER">Admin / Developer (kendali penuh)</option>
          </select>
        </div>
        <div><label className="label" htmlFor="u-pass">Kata sandi (min. 12 karakter)</label><PasswordInput id="u-pass" autoComplete="new-password" minLength={12} /></div>
        <div className="sm:col-span-2"><button className="btn btn-primary">Tambah akun</button></div>
      </form>
    </div>
  );
}
