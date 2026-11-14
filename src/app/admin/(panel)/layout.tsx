import Image from "next/image";
import Link from "next/link";
import { requireAdmin, can } from "@/lib/admin";
import { ROLE_LABEL, type Permission } from "@/lib/rbac";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

const NAV: Array<{ href: string; label: string; permission?: Permission }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inquiries", label: "Inquiry" },
  { href: "/admin/reports", label: "Laporan", permission: "report.view" },
  { href: "/admin/products", label: "Produk", permission: "product.manage" },
  { href: "/admin/taxonomy", label: "Kategori & Spek", permission: "taxonomy.manage" },
  { href: "/admin/shipping", label: "Ongkir", permission: "shipping.manage" },
  { href: "/admin/audit", label: "Audit Log", permission: "audit.view" },
  { href: "/admin/users", label: "Admin & peran", permission: "user.manage" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const nav = NAV.filter((n) => !n.permission || can(me.role, n.permission));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="no-print border-b border-[var(--line)] bg-[var(--card)] p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded-md" />
          <span className="font-extrabold">TechRevive</span>
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto text-sm font-medium lg:mt-8 lg:flex-col" aria-label="Admin">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="muted whitespace-nowrap rounded-lg px-3 py-2 transition hover:bg-[var(--color-ink-100)] hover:text-[var(--color-ink-900)]">{n.label}</Link>
          ))}
        </nav>
        <div className="mt-4 text-xs lg:absolute lg:bottom-4 lg:left-4 lg:right-4">
          <p className="font-semibold">{me.name}</p>
          <p className="muted">{ROLE_LABEL[me.role]}</p>
          <form action={logout} className="mt-2"><button className="underline">Keluar</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}
