import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { ROLE_LABEL, ROLES } from "@/lib/rbac";
import { AdminAlert } from "@/components/admin-alert";
import { BackLink } from "@/components/back-link";
import { Icon } from "@/components/icons";
import { PasswordInput } from "@/components/password-input";
import { resetAdminPassword, revokeAdminSessions, setAdminActive, setAdminRole, updateAdmin } from "../actions";

export const metadata = { title: "Edit akun" };

export default async function EditUser({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const me = await requirePermission("user.manage");
  const { id } = await params;
  const { error } = await searchParams;
  const u = await db.adminUser.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } });
  if (!u) notFound();
  const self = u.id === me.id;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <BackLink href="/admin/users">Admin & peran</BackLink>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{u.name}</h1>
        <p className="muted text-sm">{u.email} · login terakhir {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "belum pernah"}</p>
      </div>
      <AdminAlert message={error} />

      <form action={updateAdmin} className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Profil</h2>
        <input type="hidden" name="id" value={u.id} />
        <div><label className="label" htmlFor="name">Nama</label><input id="name" name="name" className="input" defaultValue={u.name} required /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" defaultValue={u.email} required /></div>
        <div className="sm:col-span-2"><button className="btn btn-primary">Simpan profil</button></div>
      </form>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">Peran &amp; status</h2>
        {self ? (
          <p className="muted text-sm">Ini akun Anda ({ROLE_LABEL[u.role]}). Peran dan status akun sendiri tidak bisa diubah.</p>
        ) : (
          <>
            <form action={setAdminRole} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={u.id} />
              <div className="min-w-48 flex-1"><label className="label" htmlFor="role">Peran</label><select id="role" name="role" className="input" defaultValue={u.role}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
              <button className="btn btn-ghost">Ubah peran</button>
            </form>
            <form action={setAdminActive} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] p-3">
              <input type="hidden" name="id" value={u.id} /><input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
              <div><p className="text-sm font-semibold">Status akun: {u.isActive ? "Aktif" : "Nonaktif"}</p><p className="muted text-xs">{u.isActive ? "Nonaktifkan untuk menutup akses tanpa menghapus akun." : "Aktifkan agar akun bisa login lagi."}</p></div>
              <button className="btn btn-ghost">{u.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
            </form>
          </>
        )}
      </section>

      <form action={resetAdminPassword} className="card space-y-3 p-5">
        <h2 className="font-bold">Kata sandi baru</h2>
        <input type="hidden" name="id" value={u.id} />
        <div><label className="label" htmlFor="password">Kata sandi baru (min. 12 karakter)</label><PasswordInput id="password" autoComplete="new-password" minLength={12} /></div>
        <button className="btn btn-primary">Simpan kata sandi</button>
        <p className="muted text-xs">Semua sesi login akun ini akan diputus.</p>
      </form>

      {!self && (
        <form action={revokeAdminSessions} className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <input type="hidden" name="id" value={u.id} />
          <div><h2 className="font-bold">Putus semua sesi login</h2><p className="muted text-xs">Akun ini harus login ulang di semua perangkat.</p></div>
          <button className="btn btn-ghost"><Icon name="lock" size={16} />Putus sesi</button>
        </form>
      )}
    </div>
  );
}
