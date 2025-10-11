# Overall Progress — Breathy Backend

Dokumen ini merangkum progres seluruh modul dan tahapan integrasi.

## Ringkasan Persentase (Isi manual/otomatis oleh skrip)

- Integrasi 01 — 60% (Node siap, `.env` template tersedia, DB belum diuji)
- Integrasi 02 — 45% (Skema SQL selesai, Prisma dipilih, migrasi/seed pending)
- Integrasi 03 — 100% (Skeleton Express berjalan, `/healthz` aktif)
- Modul fungsional — Belum dimulai (menunggu tahapan integrasi berikutnya)

## Milestone Tercapai

- Dokumen desain inti terisi: arsitektur, algoritma (ensemble triage, follow-up), API ringkas, skema DB, keamanan.
- Checklist modul dan integrasi dibuat dan diselaraskan dengan desain.
- Spesifikasi API diperbarui untuk OTP pasien dan task completion.
- Skeleton backend Node.js tersiapkan di root repo dengan lint/test base.
- Skema PostgreSQL awal tersedia di `db/schema.sql`; Prisma ditetapkan sebagai ORM.

## Hambatan & Mitigasi

- Hambatan: Koneksi DB belum diuji karena belum ada instance lokal.
- Mitigasi: Provision Postgres lokal/Docker dan perbarui `.env` sebelum melanjutkan ORM/migrasi.
- Hambatan: Keputusan final arsitektur dengan/atau tanpa Service Bus (mempengaruhi tahap 07).
- Mitigasi: Sediakan cabang tugas untuk kedua opsi; konfirmasi pilihan sebelum implementasi worker.

## Rekomendasi Sprint Berikutnya

- Provision Postgres lokal (Docker) dan jalankan `db/schema.sql` untuk menyiapkan skema awal.
- Jalankan `prisma init`, definisikan model, dan mulai migrasi terkelola (`prisma migrate dev`).
- Implement auth (OTP pasien dan JWT tenaga kesehatan) sesuai API baru.
- Siapkan storage wrapper dan upload alur (tahap 04), lalu webhook ACS (tahap 05).

## Referensi

- [overview_integration.md](../overview_integration.md)
- [management/checklists/](./checklists)
- [management/integration_checklists/](./integration_checklists)
