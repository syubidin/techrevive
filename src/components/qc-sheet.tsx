import type { Messages } from "@/lib/i18n";
import { Icon } from "./icons";

/**
 * Lembar QC contoh di hero: baris diperiksa satu per satu, lalu cap grade jatuh. Murni CSS (lihat .qc-* di globals.css),
 * jadi tanpa JavaScript tetap tampil lengkap dan "kurangi gerakan" otomatis dihormati. Isinya contoh, bukan unit nyata.
 */
export function QcSheet({ t }: { t: Messages }) {
  const q = t.hero.qc;
  return (
    <figure className="qc" aria-label={q.title}>
      <div className="qc-head">
        <span className="qc-hole" aria-hidden />
        <div>
          <p className="text-base font-extrabold leading-tight">{q.title}</p>
          <p className="muted text-xs">{q.sample}</p>
        </div>
      </div>
      <ul className="qc-rows">
        {q.rows.map((r, i) => (
          <li key={r.l} className="qc-row" style={{ "--i": i } as React.CSSProperties}>
            <svg className="qc-tick" viewBox="0 0 24 24" width="20" height="20" aria-hidden><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" pathLength="1" /></svg>
            <span className="text-sm font-semibold">{r.l}</span>
            <span className="qc-val">{r.v}</span>
            {r.bar && <span className="qc-bar" style={{ "--w": `${r.bar}%` } as React.CSSProperties} aria-hidden />}
          </li>
        ))}
      </ul>
      <div className="qc-foot">
        <p className="muted flex items-center gap-1.5 text-xs"><Icon name="shield-check" size={14} />{q.foot}</p>
        <span className="qc-stamp" style={{ "--i": q.rows.length } as React.CSSProperties}><b>{q.grade}</b><small>{q.gradeLabel}</small></span>
      </div>
    </figure>
  );
}
