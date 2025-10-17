# Breathy Backend Skeleton

## Prasyarat

- Node.js >= 18
- PostgreSQL 14+

## Instalasi

```powershell
npm install
```

## Konfigurasi Lingkungan

Salin `.env.example` menjadi `.env` lalu isi nilai sesuai kredensial Anda. Variabel penting:

- `APP_PORT`
- `DATABASE_URL`
- `TRIAGE_ALPHA`
- `TRIAGE_THRESHOLDS`
- kredensial Azure (Storage, ACS, Cognitive Services)
- `STORAGE_CORS_ALLOWED_ORIGINS` (origin frontend yang diizinkan, pisahkan dengan koma)

Server akan mencoba mengatur aturan CORS Azure Blob sesuai nilai `STORAGE_CORS_ALLOWED_ORIGINS` saat pertama kali memastikan kontainer tersedia. Pastikan kredensial Storage minimal memiliki peran **Blob Service Contributor**.

## Menjalankan Server

```powershell
npm run dev
```

Endpoint kesehatan tersedia di `GET /healthz`.

## Linting

```powershell
npm run lint
```

## Skema Database

Skema PostgreSQL awal tersedia di `src/db/schema.sql`. Jalankan file tersebut menggunakan `psql` ketika siap menyiapkan database.
