# Rencana hosting, domain, dan biaya TechRevive

Angka di bawah adalah **perkiraan**; harga berubah, jadi cek halaman resmi penyedia saat membeli.

## Pilihan yang saya rekomendasikan (hemat + aman + bisa tumbuh)
| Komponen | Pilihan | Perkiraan biaya |
|---|---|---|
| Domain `.com` | Cloudflare Registrar (harga at-cost, tanpa markup perpanjangan) | ± Rp150–200 rb / tahun |
| DNS + CDN + WAF dasar | Cloudflare (paket Free) | Gratis |
| Server | VPS kecil 1–2 vCPU / 2 GB RAM di Singapura/Jakarta + Docker Compose (Caddy + Next.js) | ± Rp60–120 rb / bulan |
| Database | Neon atau Supabase (Postgres, free tier, region Singapura) | Gratis di awal |
| Gambar produk | Cloudflare R2 (kuota gratis cukup untuk ratusan foto) | Gratis di awal |
| Anti-bot | Cloudflare Turnstile | Gratis |
| Rate limit antar-instance (opsional) | Upstash Redis free tier | Gratis |
| Monitoring | UptimeRobot (cek `/api/health`) + Sentry free | Gratis |

**Total awal: ± Rp60–120 rb/bulan + domain tahunan.** Alternatif paling murah untuk uji coba: Vercel Hobby gratis, tetapi ketentuannya melarang penggunaan komersial, jadi untuk toko yang berjualan sungguhan gunakan VPS atau paket berbayar.

## Skala
Satu VPS ini cukup untuk ribuan kunjungan per hari karena halaman publik di-cache (`revalidate`) dan di-CDN Cloudflare. Bila tumbuh: naikkan spesifikasi VPS, aktifkan Upstash agar rate limit konsisten, dan pindahkan database ke paket berbayar.

## Langkah deploy
1. Beli domain di Cloudflare, tambahkan record A ke IP VPS (proxy Cloudflare aktif → set `TRUST_CLOUDFLARE=1`).
2. Buat database Neon/Supabase; salin `DATABASE_URL` (pooled) dan `DIRECT_URL`.
3. Daftar Cloudflare Turnstile → isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY`.
4. Di VPS: pasang Docker, clone repo, salin `.env.example` ke `.env.production`, isi semua nilai. Buat rahasia dengan `openssl rand -base64 48`. Tambahkan `DOMAIN=techrevive.com`.
5. Migrasi + seed (sekali): `npx prisma migrate deploy` lalu `SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… npm run db:seed`.
6. `cd deploy && docker compose --env-file ../.env.production up -d --build`.
7. Ganti `WHATSAPP_NUMBER` placeholder dengan nomor bisnis asli, lalu restart container.
8. Aktifkan backup harian database (Neon/Supabase menyediakan) dan uji restore sekali.

## Checklist sebelum launch
- [ ] Nomor WhatsApp asli terpasang dan pesan otomatis diuji dari HP.
- [ ] Turnstile aktif; kirim satu inquiry uji dari produk draft yang sudah diterbitkan.
- [ ] Tarif ongkir diganti sesuai kurir sebenarnya (seed hanya contoh).
- [ ] Kebijakan tanpa garansi/retur dibaca ulang oleh owner (aspek hukum: konsultasikan dengan ahli hukum bila perlu).
- [ ] Kata sandi owner kuat dan unik; tidak ada akun contoh.
- [ ] Semua produk punya foto unit asli, grade, dan kesehatan baterai bila relevan.
- [ ] Uptime monitor mengarah ke `/api/health`.

## Unggah foto produk (Cloudflare R2)
1. Cloudflare Dashboard → R2 → buat bucket (mis. `techrevive-media`).
2. Bucket → Settings → Custom Domains → sambungkan `cdn.domainanda.com` (akses publik baca). Isi `IMAGE_HOST=cdn.domainanda.com`.
3. R2 → Manage API Tokens → buat token **Object Read & Write** untuk bucket itu. Isi `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
4. Restart aplikasi. Tombol **Unggah foto** muncul aktif di form produk (hanya Owner/Developer). Tanpa konfigurasi, tempel URL manual tetap berfungsi.
File diperiksa di server (magic bytes JPG/PNG/WebP, maks. 5 MB) dan diberi nama acak.
