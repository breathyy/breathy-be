# Prompt: Generate Security Middleware

Rujukan: [../../management/checklists/checklist_security.md](../../management/checklists/checklist_security.md)

Tujuan: Tambahkan middleware keamanan umum: helmet, rate limiter, CORS, payload limits, sanitasi input.

Keluaran yang diharapkan:
- middlewares/security.js meng-export setupSecurity(app).
- tests sederhana untuk memverifikasi header dan rate limit.

Batasan:
- Hindari logging PII; gunakan sampling.
