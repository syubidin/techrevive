# TechRevive: Rencana Tahap 1

## Alur (versi reseller)
1. Customer menjelajah katalog dan memakai filter (kategori, merk, kondisi, grade, harga, spek, fitur).
2. Customer membuka detail produk lalu klik **Cek Stok & Pesan** dan mengisi nama + nomor WA + area.
3. Server memvalidasi (Turnstile, rate limit, honeypot) lalu **menyimpan inquiry** dengan snapshot harga dan kode `TR-YYMMDD-XXXX`.
4. Customer diarahkan ke WhatsApp dengan pesan terisi otomatis (ID/EN).
5. Admin mengecek stok ke supplier lewat WA, lalu mengubah status inquiry menjadi *Supplier Checking* → *Quoted* (harga final + masa berlaku 24 jam).
6. Customer setuju dan membayar (transfer / VA / QRIS, dikonfirmasi manual oleh admin di tahap 1) → *Paid*.
7. Admin memesan ke supplier → *Procuring* → barang tiba ke owner → *Received by us* (QC) → *Shipped* (resi) → *Delivered*.
8. Tidak tersedia: tawarkan alternatif, atau status *Cancelled/Expired*.

## Fitur Tahap 1
**Publik:** homepage, katalog + filter (URL-shareable), detail produk (grade, baterai, foto unit asli, spek), status unit jujur (Check QC / Tersedia), halaman kebijakan (garansi 1 bulan, servis berbayar setelahnya), cara pesan, FAQ, ID/EN, SEO (sitemap, JSON-LD Product), mode gelap.
**Admin:** login aman, dashboard (inquiry baru, follow-up hari ini, omzet, laba, produk terlaris, konversi inquiry→order), CRUD produk (modal+margin otomatis, simpan harga jual), kategori/merk/definisi spek, pipeline inquiry (kanban + daftar), catatan & jadwal follow-up, order (pembayaran, ongkir, resi), tarif ongkir per zona, supplier, audit log, manajemen admin (OWNER/DEVELOPER/STAFF).

## Edge case yang ditangani
| Risiko | Penanganan |
|---|---|
| Harga modal bocor ke client | `costPrice` tidak pernah di-`select` di query publik; hanya route admin |
| Bot / spam inquiry | Turnstile (fail closed), honeypot, rate limit per IP-hash dan per nomor, batas body 4 KB |
| Inquiry ganda (klik berkali-kali) | Idempotensi: nomor+produk sama dalam 24 jam memakai kode lama |
| Nomor WA salah format | Normalisasi 08/+62/62/8 → `628…`, tolak non-seluler |
| Injeksi lewat filter | Kunci spek hanya dari whitelist `SpecDefinition`; slug/angka divalidasi regex; jumlah filter dibatasi |
| Injeksi teks di pesan WA | `sanitizeText` buang karakter kontrol/bidi; `encodeURIComponent` |
| Harga berubah setelah inquiry | Snapshot harga di inquiry; masa berlaku quote 24 jam |
| Stok habis saat inquiry | Server menolak `SOLD_OUT`; status "Cek Ketersediaan" bukan "Ready Stock" |
| Salah hitung rupiah | Integer saja, pembulatan, batas overflow, tes unit |
| Jual di bawah margin minimum | `meetsMinimumMargin` + peringatan di form admin |
| Brute force login | Argon2id, lockout, hash tiruan (anti enumerasi), rate limit |
| Pencurian sesi / CSRF | Cookie `__Host-` HttpOnly Secure SameSite=Strict, JWT maks. 1,5 jam + batas diam 45 menit (detak aktivitas dari browser), cek Origin di POST |
| XSS | CSP nonce + `strict-dynamic`, React escape default, tanpa `dangerouslySetInnerHTML` |
| Ongkir di luar area | `OUT_OF_AREA` → tawarkan tanya admin; berat volumetrik dihitung |
| Produk dihapus tetapi ada inquiry | Soft delete; inquiry menyimpan snapshot |
| Data pribadi di log | Nomor dimasking, IP hanya HMAC hash |
| Aksi admin tak terlacak | Audit log (siapa, apa, diff) |

## Biaya (perkiraan, harap diverifikasi saat membeli)
- Domain .com: ± Rp150–200 rb/tahun (Cloudflare Registrar harga at-cost).
- Hosting: Vercel Hobby gratis untuk percobaan, tetapi pemakaian komersial memerlukan paket Pro; alternatif hemat: VPS kecil (± Rp60–100 rb/bulan) + Docker.
- Database: Neon/Supabase free tier cukup untuk awal.
- Gambar: Cloudflare R2 (gratis hingga kuota).
- Turnstile, Sentry free tier: gratis.
- **Total awal realistis: ± Rp0–100 rb/bulan + domain tahunan.**

## Target (perkiraan kerja)
Minggu 1: fondasi + katalog + filter. Minggu 2: detail + inquiry + admin produk. Minggu 3: dashboard + pipeline + ongkir. Minggu 4: QA, keamanan, SEO, deploy.

## Status saat ini
Selesai: skema DB, logika harga/ongkir/telepon/filter/WA, API inquiry aman, auth, middleware CSP, token desain, pesan ID/EN, tes unit (15 lolos).
Belum: halaman UI publik dan admin, seed data, Dockerfile/CI.


## Pembaruan

Klaim garansi online, penugasan inquiry, pencarian pintar dan perbandingan produk sudah diimplementasikan (lihat `docs/ROADMAP.md` bagian Status implementasi).
