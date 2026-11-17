/** Tabel admin seragam (kartu + tabel yang bisa digulir horizontal di ponsel). Kolom terakhir = Aksi, rata kanan. */
export function DataTable({ heads, min = "40rem", empty, children }: { heads: string[]; min?: string; empty?: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth: min }}>
        <thead className="muted border-b border-[var(--line)] text-xs uppercase">
          <tr>{heads.map((h, i) => <th key={h} className={`p-3 font-semibold ${i === heads.length - 1 && h === "Aksi" ? "text-right" : ""}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">{children}</tbody>
      </table>
      {rows === 0 && <p className="muted p-6 text-center text-sm">{empty ?? "Belum ada data."}</p>}
    </div>
  );
}
