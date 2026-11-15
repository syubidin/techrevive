"use client";

/** Tombol submit yang meminta konfirmasi lebih dulu (dipakai untuk aksi hapus). */
export function ConfirmButton({ message, children, className = "text-xs underline text-[var(--color-danger-600)]", ...rest }: { message: string; children: React.ReactNode; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <button {...rest} type="submit" className={className} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
