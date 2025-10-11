# Prompt: Integrate Azure Key Vault

Rujukan: [../../design/security/guidelines.md](../../design/security/guidelines.md)

Tujuan: Ambil secrets dari Key Vault menggunakan Managed Identity atau credentials lokal.

Keluaran yang diharapkan:
- services/keyVaultService.js: getSecret(name) dengan cache ringan.

Batasan:
- Tanpa komentar, camelCase, modul ringkas. Gunakan `@azure/keyvault-secrets` dan `@azure/identity`.
