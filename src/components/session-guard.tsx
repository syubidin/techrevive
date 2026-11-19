"use client";

import { useEffect } from "react";
import { SESSION_IDLE_SEC, SESSION_PING_SEC } from "@/lib/session-policy";

const EXPIRED_URL = "/admin/login?expired=1";

/**
 * Menjaga sesi admin: selama orang aktif (klik, ketik, scroll) browser mengirim detak berkala agar sesi tidak
 * mati saat mengisi form panjang. Bila tidak ada aktivitas melewati batas diam, pengguna dialihkan ke halaman masuk.
 */
export function SessionGuard() {
  useEffect(() => {
    let lastActive = Date.now();
    let lastPing = Date.now();
    let pinging = false;
    const mark = () => { lastActive = Date.now(); };
    const expire = () => window.location.replace(EXPIRED_URL);

    const tick = async () => {
      const now = Date.now();
      if (now - lastActive > SESSION_IDLE_SEC * 1000) return expire();
      if (!pinging && lastActive > lastPing && now - lastPing > SESSION_PING_SEC * 1000) {
        pinging = true;
        try {
          const res = await fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" });
          lastPing = Date.now();
          if (res.status === 401) expire();
        } catch {
          /* offline sesaat: coba lagi pada tick berikutnya */
        } finally {
          pinging = false;
        }
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };

    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void tick(), 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}
