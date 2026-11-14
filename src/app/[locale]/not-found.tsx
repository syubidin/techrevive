import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="text-6xl font-extrabold">404</p>
      <p className="muted mt-3">Halaman tidak ditemukan · Page not found</p>
      <Link href="/" className="btn btn-primary mt-6">TechRevive</Link>
    </div>
  );
}
