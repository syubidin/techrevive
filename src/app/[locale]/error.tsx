"use client";

import { Icon } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-x grid max-w-xl place-items-center gap-3 py-24 text-center">
      <span className="text-amber-600"><Icon name="alert" size={44} /></span>
      <h1 className="text-2xl font-extrabold">Terjadi kendala &middot; Something went wrong</h1>
      <p className="muted text-sm">Halaman gagal dimuat. Coba lagi. / The page failed to load. Please try again.</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-2"><Icon name="refresh" size={18} />Coba lagi / Retry</button>
    </div>
  );
}
