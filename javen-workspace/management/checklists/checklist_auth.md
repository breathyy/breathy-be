# Checklist Modul: Autentikasi (OTP Pasien & JWT Tenaga Kesehatan)

Rujukan: [../../design/api/api_specification.md](../../design/api/api_specification.md), [../../design/security/guidelines.md](../../design/security/guidelines.md)

## Tugas

- [x] Pasien OTP via WhatsApp:
  - [x] Endpoint POST /auth/patient/otp/request (validasi nomor, rate limit, simpan hash+expiry ke otp_codes, kirim via ACS SDK/REST).
  - [x] Endpoint POST /auth/patient/otp/verify (verifikasi; buat/temukan user; open case IN_CHATBOT).
  - [ ] Anti-abuse: attempt counter, lockout singkat, audit log.
- [x] Tenaga kesehatan (DOCTOR/HOSPITAL) JWT:
  - [x] Endpoint POST /auth/login (email/password + role) → JWT.
  - [x] GET /me untuk profil dan role.
  - [x] Hash password (bcrypt), rotasi secret JWT.
- [ ] RBAC Middleware:
  - [x] requireRole('DOCTOR'|'HOSPITAL'|'ADMIN') untuk rute sensitif.
  - [ ] CORS, Helmet, rate-limiter untuk rute auth.

## Verifikasi

- [ ] Uji OTP benar/salah/expired; uji rate limit.
- [ ] Uji login JWT dan akses rute berbasis role.
 - [ ] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

## Catatan

- Endpoint OTP request/verify aktif; attempt counter dan cooldown implemented, audit log masih pending.
- JWT login + profil tenaga kesehatan tersedia; middleware verifikasi bearer token & role aktif, pending rate limiter.

## Target

- Target selesai: ...
