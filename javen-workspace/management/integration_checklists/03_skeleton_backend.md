# 03 - Skeleton Backend & Health Check

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Buat app Express dengan middleware logger, JSON parser, error handler.
- [x] Endpoint GET `/healthz` mengembalikan 200 OK dan status DB opsional.
- [x] Struktur folder: routes, controllers, services, models, middlewares, utils, config.
- [x] Skrip dev (nodemon) dan linting dasar.
- [x] Siapkan routing dasar untuk: /auth (patient OTP & provider login), /chat, /cases, /tasks, /referrals.

## Verifikasi

- [x] Server lokal berjalan; `/healthz` OK.

## Catatan

- Routes masih stub (mengembalikan 501). Konektivitas DB akan diaktifkan setelah konfigurasi DATABASE_URL tersedia.
