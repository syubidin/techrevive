import { AdminNav, type AdminNavItem } from "@/components/admin-nav";
import { ConfirmProvider } from "@/components/confirm-provider";
import { Icon } from "@/components/icons";
import { requireAdmin, can } from "@/lib/admin";
import { ROLE_LABEL, type Permission } from "@/lib/rbac";
import { logout, logoutEverywhere } from "../login/actions";

export const dynamic = "force-dynamic";

const NAV: Array<AdminNavItem & { permission?: Permission }> = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/inquiries", label: "Inquiry", icon: "inbox" },
  { href: "/admin/reports", label: "Laporan", icon: "chart", permission: "report.view" },
  { href: "/admin/products", label: "Produk", icon: "package", permission: "product.manage" },
  { href: "/admin/taxonomy", label: "Kategori & Spek", icon: "layers", permission: "taxonomy.manage" },
  { href: "/admin/shipping", label: "Ongkir", icon: "truck", permission: "shipping.manage" },
  { href: "/admin/audit", label: "Audit Log", icon: "history", permission: "audit.view" },
  { href: "/admin/users", label: "Admin & peran", icon: "users", permission: "user.manage" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const items: AdminNavItem[] = NAV.filter((n) => !n.permission || can(me.role, n.permission)).map(({ href, label, icon }) => ({ href, label, icon }));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <AdminNav items={items}>
        <p className="text-sm font-semibold">{me.name}</p>
        <p className="muted text-xs">{ROLE_LABEL[me.role]}</p>
        <div className="mt-3 grid gap-1">
          <form action={logout} data-confirm="Anda akan keluar dari admin di perangkat ini."><button className="btn btn-ghost btn-sm w-full justify-start"><Icon name="log-out" size={16} />Keluar</button></form>
          <form action={logoutEverywhere} data-confirm="Semua perangkat yang sedang login dengan akun ini akan dikeluarkan, termasuk perangkat ini."><button className="btn btn-ghost btn-sm muted w-full justify-start" title="Putus login di semua perangkat"><Icon name="lock" size={16} />Keluar semua perangkat</button></form>
        </div>
      </AdminNav>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      <ConfirmProvider />
    </div>
  );
}
