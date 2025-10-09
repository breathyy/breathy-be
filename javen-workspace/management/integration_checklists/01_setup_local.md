# 01 - Setup Lokal

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Instal Node.js LTS (>=18) dan npm/yarn.
- [ ] Siapkan Postgres lokal atau Docker; catat DATABASE_URL.
- [ ] (Opsional) Instal Azurite untuk emulasi Storage.
- [ ] Buat `.env` dari `.env.example`: APP_PORT, NODE_ENV, JWT_SECRET, DATABASE_URL, AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, COPILOT_*, AZURE_CV_*, ACS_*, SERVICE_BUS_* (jika dipakai), APPINSIGHTS_CONNECTION_STRING, TRIAGE_ALPHA, TRIAGE_THRESHOLDS.
- [ ] Verifikasi skrip dev berjalan (contoh: npm run dev) dan endpoint `/healthz` (nantinya di tahap 03).

## Verifikasi

- [ ] Lingkungan berjalan; versi Node dan koneksi DB teruji.

## Catatan

- ...
