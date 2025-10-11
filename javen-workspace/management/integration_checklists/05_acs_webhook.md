# 05 - Azure Communication Services (WhatsApp) & Webhook

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Aktifkan kanal WhatsApp dan arahkan webhook ke `POST /chat/incoming`.
- [ ] Konfigurasi inbound webhook ke `POST /chat/incoming` (gunakan ngrok/Dev Tunnels untuk lokal).
- [ ] Implement `chatController`: deteksi teks vs media, simpan metadata, hubungkan ke cases.
- [ ] Implement outbound util untuk mengirim pesan OTP/konfirmasi.
 - [ ] Pastikan akses media aman (SAS URL) dan pembersihan metadata sensitif.

## Verifikasi

- [ ] Pesan WA masuk → webhook menerima → data tersimpan.

## Catatan

- ...
- [ ] Instal ACS SDK atau gunakan REST sebagai fallback; set `.env` ACS_CONNECTION_STRING, ACS_WHATSAPP_NUMBER.
- [ ] Outbound OTP via ACS; untuk media inbound, unduh dan unggah ke Blob via `blobService`.
