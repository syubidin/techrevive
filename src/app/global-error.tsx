"use client";

import { StateScreen } from "@/components/state-screen";
import "./globals.css";

// Dipakai bila layout utama sendiri gagal (jarang). Wajib membawa <html> sendiri.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body>
        <StateScreen kind="error" reset={reset} />
      </body>
    </html>
  );
}
