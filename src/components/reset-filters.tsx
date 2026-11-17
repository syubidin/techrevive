"use client";

import { useRouter } from "next/navigation";

/** Atur ulang filter: kosongkan semua centang dan isian pada form, lalu kembali ke daftar tanpa filter. Tetap berupa tautan biasa tanpa JavaScript. */
export function ResetFilters({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <a
      href={href}
      className="muted text-xs underline"
      onClick={(e) => {
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>("input").forEach((el) => {
          if (el.type === "checkbox" || el.type === "radio") el.checked = false;
          else if (el.type !== "hidden") el.value = "";
        });
        router.push(href);
      }}
    >
      {label}
    </a>
  );
}
