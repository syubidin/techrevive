"use client";

import { useEffect } from "react";

/**
 * Mencegah gambar dan tautan diseret (drag) di seluruh situs, termasuk di Firefox yang mengabaikan CSS user-drag.
 * Tidak menyentuh sentuhan/scroll biasa. Hanya menghalangi salin iseng, bukan perlindungan hak cipta yang sebenarnya.
 */
export function NoDrag() {
  useEffect(() => {
    const block = (e: DragEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("img, picture, svg, a, canvas")) e.preventDefault();
    };
    // Menu klik kanan / tahan-tekan pada gambar (simpan gambar) ditutup; menu pada teks dan tautan tetap normal.
    const menu = (e: Event) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest("img, picture, canvas, video")) e.preventDefault();
    };
    document.addEventListener("dragstart", block);
    document.addEventListener("contextmenu", menu);
    return () => { document.removeEventListener("dragstart", block); document.removeEventListener("contextmenu", menu); };
  }, []);
  return null;
}
