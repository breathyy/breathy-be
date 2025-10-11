# 02 - Database & Skema Data

Rujukan: [design/database/schema.md](../../design/database/schema.md)

## Tugas

- [x] Pilih ORM (Prisma/Sequelize) dan inisialisasi proyek (Prisma).
- [x] Definisikan model/tabel: users, doctor_users, hospital_users, hospitals, cases, daily_tasks, referrals, chat_messages, otp_codes, images, symptoms.
- [ ] Buat migrasi pertama dan jalankan.
- [ ] Seed data fasilitas contoh (apotek/RS) dengan koordinat.
- [x] Implement enum/constraint: CaseStatus(IN_CHATBOT, WAITING_DOCTOR, MILD, MODERATE, SEVERE) dan SputumCategory(GREEN, BLOOD_TINGED, VISCOUS, CLEAR, UNKNOWN).
- [ ] Tes koneksi DB dari app (health DB OK).

## Verifikasi

- [ ] Semua tabel terbentuk; relasi foreign key benar.

## Catatan

- Skema SQL awal disiapkan di `db/schema.sql` (termasuk enum dan indeks). ORM yang dipakai Prisma; migrasi dan seeding berikutnya dibuat via `prisma migrate`.
- Koneksi DB belum diuji karena belum ada instance lokal.
