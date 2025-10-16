# 01 - Setup Lokal

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Instal Node.js LTS (>=18) dan npm/yarn.
- [x] Siapkan Postgres lokal atau Docker; catat DATABASE_URL.
- [x] Buat `.env` dari `.env.example`: APP_PORT, NODE_ENV, JWT_SECRET, DATABASE_URL, AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, COPILOT_*, AZURE_CV_*, ACS_*, APPINSIGHTS_CONNECTION_STRING, TRIAGE_ALPHA, TRIAGE_THRESHOLDS.
- [x] Verifikasi skrip dev berjalan (contoh: npm run dev) dan endpoint `/healthz` (nantinya di tahap 03).

## Verifikasi

- [x] Lingkungan berjalan; versi Node dan koneksi DB teruji.

## Catatan

- Node + npm aktif; skrip `npm run dev` berjalan setelah `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
- `.env` terisi URL Neon PostgreSQL; koneksi diuji sukses via skrip Node singkat.
