/**
 * Pemutusan sesi: setiap token login membawa `sv` (versi sesi akun saat login).
 * Bila versi di database dinaikkan (reset sandi, ganti peran, nonaktifkan, "keluar dari semua perangkat"),
 * semua token lama otomatis tidak berlaku. Token lama tanpa `sv` dianggap versi 0.
 */
export const normalizeSv = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);
export const isSessionCurrent = (tokenSv: unknown, dbSv: number): boolean => normalizeSv(tokenSv) === dbSv;
