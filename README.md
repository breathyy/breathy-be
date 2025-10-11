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
