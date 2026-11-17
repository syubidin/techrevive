import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDateTime, requirePermission } from "@/lib/admin";
import { ROLE_LABEL } from "@/lib/rbac";
import { AdminAlert } from "@/components/admin-alert";
import { AdminPageHeader } from "@/components/admin-page-header";
import { Icon } from "@/components/icons";
import { ConfirmButton } from "../../confirm-button";
import { deleteAdmin } from "./actions";

export const metadata = { title: "Admin & peran" };

const ROLE_TONE = { DEVELOPER: "chip-tone-info", OWNER: "chip-tone-ok", STAFF: "" } as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const me = await requirePermission("user.manage");
  const { error } = await searchParams;
  const users = await db.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } });
  return (
    <div className="space-y-5">
      <AdminPageHeader title={`Admin & peran (${users.length})`} icon="users">
        <Link href="/admin/users/new" className="btn btn-primary btn-sm"><Icon name="plus" size={16} />Tambah akun</Link>
      </AdminPageHeader>
      <AdminAlert message={error} />

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="muted border-b border-[var(--line)] text-xs uppercase">
            <tr><th className="p-3 font-semibold">Nama</th><th className="p-3 font-semibold">Email</th><th className="p-3 font-semibold">Peran</th><th className="p-3 font-semibold">Status</th><th className="p-3 font-semibold">Login terakhir</th><th className="p-3 text-right font-semibold">Aksi</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-semibold">{u.name}{u.id === me.id && <span className="chip chip-tone-info ml-2 !py-0">Anda</span>}</td>
                <td className="muted p-3">{u.email}</td>
                <td className="p-3"><span className={`chip ${ROLE_TONE[u.role]}`}>{ROLE_LABEL[u.role]}</span></td>
                <td className="p-3"><span className={`chip ${u.isActive ? "chip-tone-ok" : "chip-tone-mute"}`}>{u.isActive ? "Aktif" : "Nonaktif"}</span></td>
                <td className="muted whitespace-nowrap p-3 text-xs">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "Belum pernah"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/users/${u.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" size={14} />Edit</Link>
                    {u.id !== me.id && (
                      <form action={deleteAdmin}>
                        <input type="hidden" name="id" value={u.id} />
                        <ConfirmButton className="btn btn-ghost btn-sm text-[var(--color-danger-600)]" message={`Hapus akun ${u.email} secara permanen? Jejak audit tetap tersimpan. Untuk berhenti sementara, gunakan Nonaktifkan di tombol Edit.`}><Icon name="trash" size={14} />Hapus</ConfirmButton>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted text-xs">Mengubah peran, menonaktifkan, atau mengatur ulang kata sandi otomatis memutus semua sesi login akun tersebut. Sistem selalu menyisakan minimal satu Admin/Developer aktif.</p>
    </div>
  );
}
