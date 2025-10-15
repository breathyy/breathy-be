# Overall Progress — Breathy Backend

Dokumen ini merangkum progres seluruh modul dan tahapan integrasi.

## Ringkasan Persentase (Isi manual/otomatis oleh skrip)

- Integrasi 01 — 100% (Node siap, `.env` memakai koneksi Neon PostgreSQL, konektivitas teruji)
- Integrasi 02 — 100% (Skema SQL terpasang di Neon, Prisma terpilih, seed fasilitas dasar selesai)
- Integrasi 03 — 100% (Skeleton Express berjalan, `/healthz` aktif)
- Integrasi 04 — 60% (layanan Blob & endpoint media tersedia, Vision stub menghitung s_i; provisioning Storage & uji SAS masih pending)
- Integrasi 05 — 55% (webhook `/chat/incoming`, chatService, dan OTP outbound util aktif; provisioning ACS & audit log pending)
- Modul fungsional — Belum dimulai (menunggu tahapan integrasi berikutnya)

## Milestone Tercapai

- Dokumen desain inti terisi: arsitektur, algoritma (ensemble triage, follow-up), API ringkas, skema DB, keamanan.
- Checklist modul dan integrasi dibuat dan diselaraskan dengan desain.
- Spesifikasi API diperbarui untuk OTP pasien dan task completion.
- Skeleton backend Node.js tersiapkan di root repo dengan lint/test base.
- Skema PostgreSQL awal tersedia di `db/schema.sql`; Prisma ditetapkan sebagai ORM; koneksi Neon siap digunakan dan data fasilitas awal sudah ada; Prisma client digenerate ke `src/generated/prisma`.
- Layanan `blob.service.js` dan endpoint `/cases/:caseId/images/*` aktif dengan penyimpanan `quality_metrics` default dan stub Vision menghitung skor `s_i`.
- Webhook `/chat/incoming` dan `chatService` menangani pesan teks/gambar, membuat user/case secara otomatis.
- Stub outbound util ACS tersedia di `src/services/acs.service.js`, mencatat pesan keluar sebagai pending sambil menunggu kredensial resmi.
- Endpoint OTP pasien `/auth/patient/otp/request|verify` aktif dengan hash OTP, cooldown, dan reuse util ACS untuk pengiriman/dry-run.
- Endpoint JWT tenaga kesehatan `/auth/login` dan `/auth/me` tersedia dengan middleware verifikasi Bearer token + RBAC `requireRole`.
- Approval dokter pada kasus `WAITING_DOCTOR` sekarang menghitung triage final dan memicu generator tugas follow-up 7 hari (MILD/MODERATE) sekaligus membersihkan tugas bila status berubah ke SEVERE.
- Webhook teks pasien memicu `nluService` (Azure Text Analytics) untuk menyimpan skor gejala `severity_symptom` langsung ke tabel `symptoms`.
- Vision service menggunakan Azure Computer Vision (jika kredensial & SAS tersedia) untuk menetapkan marker dan S_i; fallback lokal tetap tersedia.
- Application Insights client disiapkan untuk trace dan metric dengan auto-collect; logger dan error handler mengirim telemetri saat connection string tersedia.

## Hambatan & Mitigasi

- Hambatan: Keputusan final arsitektur dengan/atau tanpa Service Bus (mempengaruhi tahap 07).
- Mitigasi: Sediakan cabang tugas untuk kedua opsi; konfirmasi pilihan sebelum implementasi worker.
- Hambatan: Kredensial Azure Storage belum tersedia sehingga endpoint media hanya merespons 503 dan verifikasi SAS belum dapat dilakukan.
- Mitigasi: Provision Storage account atau gunakan Azurite sementara untuk pengujian lokal.

## Rekomendasi Sprint Berikutnya

- Provision Azure Storage account + container kemudian isi `.env` agar SAS dapat diuji end-to-end.
- Lengkapi integrasi Azure CV (atau service mock) untuk menggantikan stub sekaligus menerapkan QC blur/kecerahan.
- Provision ACS WhatsApp channel dan isi kredensial `.env` untuk menguji webhook inbound/outbound serta menyalakan pengiriman OTP nyata.
- Seed akun dokter/RS dengan hash bcrypt via skrip atau migrasi sebelum uji login.
- Lengkapi audit log + anti-abuse OTP, berikut rate limiter pada rute auth.

## Referensi

- [overview_integration.md](../overview_integration.md)
- [management/checklists/](./checklists)
- [management/integration_checklists/](./integration_checklists)
