"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Link navbar dengan penanda halaman aktif (garis bawah + warna tegas) dan animasi hover. `variant="menu"` untuk menu mobile. */
export function NavLink({ href, children, variant = "bar", onClick, className = "" }: { href: string; children: React.ReactNode; variant?: "bar" | "menu"; onClick?: () => void; className?: string }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined} className={`${variant === "bar" ? "nav-link" : "menu-link"} ${className}`}>
      {children}
    </Link>
  );
}
