import Link from "next/link";

/** Link footer: hanya efek hover/fokus (penanda halaman aktif ada di navbar, bukan di footer). */
export function FooterLink({ href, children }: { href: string; children: React.ReactNode; match?: boolean }) {
  return <Link href={href} className="footer-link">{children}</Link>;
}
