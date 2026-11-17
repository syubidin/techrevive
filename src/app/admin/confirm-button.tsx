/**
 * Tombol aksi berbahaya (hapus). Konfirmasinya ditangani popup global (ConfirmProvider) lewat `data-confirm`,
 * sehingga tidak perlu logika sendiri di sini.
 */
export function ConfirmButton({ message, children, className = "btn btn-ghost btn-sm text-[var(--color-danger-600)]", ...rest }: { message: string; children: React.ReactNode; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <button {...rest} type="submit" className={className} data-confirm={message}>
      {children}
    </button>
  );
}
