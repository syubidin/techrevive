"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Link footer dengan penanda halaman aktif dan garis bawah animasi saat hover/fokus. */
export function FooterLink({ href, children, match = true }: { href: string; children: React.ReactNode; match?: boolean }) {
  const path = usePathname();
  const active = match && (path === href || path.startsWith(`${href}/`));
  return (
    <Link href={href} className="footer-link" aria-current={active ? "page" : undefined} data-active={active ? "true" : undefined}>
      {children}
    </Link>
  );
}
