# Checklist Modul: Keamanan & Privasi

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Gunakan `.env` untuk secrets; jangan commit. Tambahkan `.env.example`.
- [ ] Implementasi JWT untuk auth; simpan hash password dokter/RS dengan bcrypt.
- [ ] RBAC: role DOCTOR, HOSPITAL, ADMIN; middleware otorisasi per route.
- [ ] Pembersihan PII/PHI dari metadata gambar; enkripsi at-rest di Storage; HTTPS wajib.
- [ ] Logging terkontrol: hindari mencetak PII; gunakan App Insights dengan sampling.
- [ ] Key Vault untuk prod/staging; rotasi kunci berkala.

## Verifikasi

- [ ] Penetration checklist minimal: autentikasi, otorisasi, input validation, rate-limiting.
- [ ] Review konfigurasi CORS, helmet, dan payload size limits.

## Catatan

- ...

## Target

- Target selesai: ...
