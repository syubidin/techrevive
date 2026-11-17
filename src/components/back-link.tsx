import Link from "next/link";
import { Icon } from "./icons";

/** Tombol kembali standar di bagian atas halaman admin. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="muted inline-flex min-h-11 items-center gap-1 text-sm hover:underline"><Icon name="arrow-left" size={16} />{children}</Link>;
}
