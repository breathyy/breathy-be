# Prompt: Generate Auth Module (JWT)

Rujukan: [../../design/api/api_specification.md](../../design/api/api_specification.md), [../../management/checklists/checklist_security.md](../../management/checklists/checklist_security.md), [../../management/checklists/checklist_auth.md](../../management/checklists/checklist_auth.md)

Tujuan: Buat modul autentikasi lengkap: OTP pasien via WhatsApp (ACS SDK/REST) dan JWT untuk dokter/rumah sakit dengan hash password bcrypt, termasuk middleware otorisasi RBAC.

Keluaran yang diharapkan:
- routes/authRoutes.js:
	- POST /auth/patient/otp/request
	- POST /auth/patient/otp/verify
	- POST /auth/login (doctor/hospital)
	- POST /auth/register (opsional), token refresh (opsional)
- middlewares/auth.js: verifyJWT(), requireRole('DOCTOR'|'HOSPITAL'|'ADMIN').
- services/authService.js: validate credentials, issue tokens, hash/compare; otpService: generate/verify OTP (hash+expiry, attempts, rate limit) dan kirim via ACS wrapper.
- models (jika ORM): users, otp_codes, doctor_users, hospital_users.

Batasan:
- Gunakan async/await; tangani error dengan next(err). Tanpa komentar, camelCase, modul ringkas.
- Tambahkan unit test minimal (OTP benar/salah/expired; login JWT; RBAC route guard).

Catatan:
- Ikuti checklist_security.md untuk praktik keamanan.
