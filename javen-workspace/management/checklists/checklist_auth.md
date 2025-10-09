# Checklist Modul: Autentikasi (OTP Pasien & JWT Tenaga Kesehatan)

Rujukan: [../../design/api/api_specification.md](../../design/api/api_specification.md), [../../design/security/guidelines.md](../../design/security/guidelines.md)

## Tugas

- [ ] Pasien OTP via WhatsApp:
  - [ ] Endpoint POST /auth/patient/otp/request (validasi nomor, rate limit, simpan hash+expiry ke otp_codes, kirim via ACS).
  - [ ] Endpoint POST /auth/patient/otp/verify (verifikasi; buat/temukan user; open case IN_CHATBOT).
  - [ ] Anti-abuse: attempt counter, lockout singkat, audit log.
- [ ] Tenaga kesehatan (DOCTOR/HOSPITAL) JWT:
  - [ ] Endpoint POST /auth/login (email/password + role) → JWT.
  - [ ] GET /me untuk profil dan role.
  - [ ] Hash password (bcrypt), rotasi secret JWT.
- [ ] RBAC Middleware:
  - [ ] requireRole('DOCTOR'|'HOSPITAL'|'ADMIN') untuk rute sensitif.
  - [ ] CORS, Helmet, rate-limiter untuk rute auth.

## Verifikasi

- [ ] Uji OTP benar/salah/expired; uji rate limit.
- [ ] Uji login JWT dan akses rute berbasis role.

## Catatan

- ...

## Target

- Target selesai: ...
