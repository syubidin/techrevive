import { notFound } from "next/navigation";

// Tanpa ini, alamat yang tidak cocok dengan rute mana pun memakai halaman 404 bawaan Next (polos, tanpa header/gambar).
export default function CatchAll() {
  notFound();
}
