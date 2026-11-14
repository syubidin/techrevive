# Pekerjaan terjadwal & notifikasi

Endpoint `POST /api/cron/maintenance` (header `Authorization: Bearer <CRON_SECRET>`) menjalankan:
1. Penawaran lewat masa berlaku menjadi **Kedaluwarsa**.
2. Peringatan **inquiry baru belum dibalas** melewati SLA (`replySlaMinutes`, default 15 menit), sekali per inquiry.
3. Pengingat **follow-up jatuh tempo**, sekali per jadwal.

Aman dipanggil berulang. Tanpa `CRON_SECRET` endpoint menolak semua permintaan.

## Cara menjadwalkan (pilih satu, tiap 10 menit)
- **GitHub Actions** (gratis): file `.github/workflows/maintenance.yml` sudah disiapkan. Tambahkan secrets `SITE_URL` dan `CRON_SECRET` di repo.
- **VPS/Docker**: `*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://DOMAIN/api/cron/maintenance`
- **Vercel**: tambahkan `crons` di `vercel.json` (`path: /api/cron/maintenance`); Vercel otomatis mengirim `CRON_SECRET` bila variabelnya ada.

## Notifikasi
Isi `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` dan/atau `NOTIFY_WEBHOOK_URL` di `.env`. Inquiry baru dikirim langsung saat dibuat (nomor customer disamarkan); SLA, follow-up, dan kedaluwarsa dikirim oleh pekerjaan terjadwal. Tanpa konfigurasi, notifikasi nonaktif tanpa error. Dashboard tetap menandai kedaluwarsa saat dibuka sebagai cadangan.
