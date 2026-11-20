/** Jadwal follow-up (murni, diuji). Semua nilai input berupa waktu WIB format "YYYY-MM-DDTHH:mm". */
const WIB_MS = 7 * 3600 * 1000;
const DAY_MS = 86_400_000;
const RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const FOLLOW_UP_MAX_DAYS = 365;

/** Date -> teks WIB untuk <input type="datetime-local">. */
export const toWibInput = (d: Date | null): string => (d ? new Date(d.getTime() + WIB_MS).toISOString().slice(0, 16) : "");

export type FollowUpResult = { ok: true; date: Date | null } | { ok: false; error: string };

/** Kosong = hapus jadwal. Harus di masa depan dan paling jauh 1 tahun. */
export function parseFollowUp(value: string, now: Date = new Date()): FollowUpResult {
  const v = value.trim();
  if (!v) return { ok: true, date: null };
  if (!RE.test(v)) return { ok: false, error: "Format tanggal tidak valid." };
  const date = new Date(`${v}:00+07:00`);
  if (Number.isNaN(date.getTime())) return { ok: false, error: "Tanggal follow-up tidak valid." };
  if (date.getTime() <= now.getTime()) return { ok: false, error: "Jadwal harus di masa depan." };
  if (date.getTime() - now.getTime() > FOLLOW_UP_MAX_DAYS * DAY_MS) return { ok: false, error: "Jadwal terlalu jauh (maksimal 1 tahun)." };
  return { ok: true, date };
}

/** Pilihan cepat, selalu pukul 09:00 WIB. */
export function followUpPresets(now: Date = new Date()): Array<{ key: string; label: string; value: string }> {
  const at = (days: number) => {
    const wib = new Date(now.getTime() + WIB_MS + days * DAY_MS);
    return `${wib.toISOString().slice(0, 10)}T09:00`;
  };
  return [
    { key: "d1", label: "Besok", value: at(1) },
    { key: "d3", label: "3 hari", value: at(3) },
    { key: "d7", label: "1 minggu", value: at(7) },
  ];
}
