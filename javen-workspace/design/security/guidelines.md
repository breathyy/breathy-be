# Panduan Keamanan & Privasi

- Gunakan JWT untuk auth; hash password (bcrypt) untuk dokter/RS; RBAC per route.
- Simpan secrets hanya di .env (dev) dan Key Vault (prod); jangan log PII.
- Sanitasi metadata gambar; enkripsi at-rest di Storage dan TLS in-transit.
- Terapkan Helmet, rate limiting, CORS, payload size limits.
- Gunakan Application Insights untuk observabilitas dengan sampling; hindari payload raw.
