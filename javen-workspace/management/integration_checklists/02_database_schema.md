# 02 - Database & Skema Data

Rujukan: [design/database/schema.md](../../design/database/schema.md)

## Tugas

- [x] Pilih ORM (Prisma/Sequelize) dan inisialisasi proyek (Prisma).
- [x] Definisikan model/tabel: users, doctor_users, hospital_users, hospitals, cases, daily_tasks, referrals, chat_messages, otp_codes, images, symptoms.
- [x] Buat migrasi pertama dan jalankan.
- [x] Seed data fasilitas contoh (apotek/RS) dengan koordinat.
- [x] Implement enum/constraint: CaseStatus(IN_CHATBOT, WAITING_DOCTOR, MILD, MODERATE, SEVERE) dan SputumCategory(GREEN, BLOOD_TINGED, VISCOUS, CLEAR, UNKNOWN).
- [x] Tes koneksi DB dari app (health DB OK).

## Verifikasi

- [x] Semua tabel terbentuk; relasi foreign key benar.

## Catatan

- Skema SQL awal disiapkan di `db/schema.sql` (termasuk enum dan indeks). ORM yang dipakai Prisma; migrasi dan seeding berikutnya dibuat via `prisma migrate`.
- Koneksi Neon PostgreSQL aktif; `schema.sql` dieksekusi ke instance Neon dan diverifikasi (query daftar tabel).
- Seed awal fasilitas dijalankan melalui `node src/db/seed.js` dan idempoten terhadap nama fasilitas.
- Prisma diinisialisasi (`npx prisma init`), skema diintrospeksi dari Neon (`prisma db pull`), dan klien digenerate ke `src/generated/prisma`.
- Wrapper konfigurasi Prisma disiapkan di `src/config/prisma.config.js` untuk reuse koneksi.
