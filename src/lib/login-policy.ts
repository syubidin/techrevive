/** Kebijakan kunci akun login admin (murni, bisa diuji). */
export const LOCK_AFTER_FAILS = 5;

/**
 * Durasi kunci progresif menurut jumlah gagal berturut-turut (tidak di-reset saat kunci, hanya saat login berhasil):
 * 5 gagal = 15 menit, 10 = 1 jam, 15 = 6 jam, 20+ = 24 jam. Di bawah 5 = tidak dikunci (0).
 */
export function lockDurationMs(fails: number): number {
  if (fails < LOCK_AFTER_FAILS) return 0;
  if (fails < 10) return 15 * 60_000;
  if (fails < 15) return 60 * 60_000;
  if (fails < 20) return 6 * 60 * 60_000;
  return 24 * 60 * 60_000;
}

/** Hanya kelipatan 5 yang memicu kunci baru agar percobaan sesudah kunci habis tidak langsung mengunci lagi tanpa alasan. */
export function shouldLock(fails: number): boolean {
  return fails >= LOCK_AFTER_FAILS && fails % LOCK_AFTER_FAILS === 0;
}
