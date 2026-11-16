import Link from "next/link";
import { Icon } from "@/components/icons";

// not-found tidak menerima params locale; teks dwibahasa ringkas.
export default function NotFound() {
  return (
    <div className="container-x grid max-w-xl place-items-center gap-3 py-24 text-center">
      <span className="muted"><Icon name="search" size={44} /></span>
      <p className="text-5xl font-extrabold">404</p>
      <p className="muted">Halaman tidak ditemukan &middot; Page not found</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link href="/id/catalog" className="btn btn-primary">Katalog</Link>
        <Link href="/" className="btn btn-ghost"><Icon name="home" size={18} />TechRevive</Link>
      </div>
    </div>
  );
}
