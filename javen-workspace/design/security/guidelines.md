# Panduan Keamanan & Privasi

- JWT untuk auth; hash password (bcrypt) untuk dokter/RS; RBAC per route
- Secrets di .env untuk dev, Key Vault di prod; hindari logging PII
- Sanitasi metadata gambar; enkripsi at-rest di Blob; TLS in-transit
- Helmet, rate limiting, CORS, payload size limits
- Application Insights opsional dengan sampling
- Azure SDK auth: gunakan connection string/key di dev; untuk prod gunakan Managed Identity/Key Vault
