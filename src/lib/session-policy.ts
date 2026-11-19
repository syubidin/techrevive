/**
 * Kebijakan waktu sesi admin (murni, tanpa dependensi, dipakai server, middleware, dan browser).
 * - Batas mutlak: sesi mati paling lama 1,5 jam sejak login, seaktif apa pun.
 * - Batas diam: sesi mati bila 45 menit tanpa aktivitas.
 */
export const SESSION_ABSOLUTE_SEC = 60 * 90; // 1,5 jam
export const SESSION_IDLE_SEC = 60 * 45; // 45 menit
/** Cap aktivitas terakhir (`la`) diperbarui paling sering sekali per interval ini agar cookie tidak ditulis ulang di tiap permintaan. */
export const SESSION_TOUCH_SEC = 60;
/** Interval ping dari browser yang sedang dipakai (harus jauh di bawah batas diam). */
export const SESSION_PING_SEC = 60 * 4;

/** Aktivitas terakhir (detik epoch). Token lama tanpa `la` memakai waktu terbit (`iat`). */
export function lastActivity(p: { la?: unknown; iat?: unknown }): number {
  if (typeof p.la === "number" && Number.isFinite(p.la)) return p.la;
  if (typeof p.iat === "number" && Number.isFinite(p.iat)) return p.iat;
  return 0;
}

export const isIdleExpired = (la: number, nowSec: number): boolean => nowSec - la > SESSION_IDLE_SEC;
export const needsTouch = (la: number, nowSec: number): boolean => nowSec - la >= SESSION_TOUCH_SEC;
