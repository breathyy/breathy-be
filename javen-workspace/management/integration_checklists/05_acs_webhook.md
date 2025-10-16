# 05 - Azure Communication Services (WhatsApp) & Webhook

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Aktifkan kanal WhatsApp dan arahkan webhook ke `POST /chat/incoming`.
- [ ] Konfigurasi inbound webhook ke `POST /chat/incoming` (gunakan ngrok/Dev Tunnels untuk lokal).
- [x] Implement `chatController`: deteksi teks vs media, simpan metadata, hubungkan ke cases.
- [x] Implement outbound util untuk mengirim pesan OTP/konfirmasi.
- [ ] Pastikan akses media aman (SAS URL) dan pembersihan metadata sensitif.

## Verifikasi

- [ ] Pesan WA masuk → webhook menerima → data tersimpan.

## Catatan

- Endpoint `/chat/incoming` kini memanggil `chatService.processIncomingMessage`; pastikan Event Grid/Router ACS mengarah ke URL publik backend.
- Outbound util `src/services/acs.service.js` sekarang menandatangani permintaan REST WhatsApp (preview API 2023-11-15). Set variabel `.env`: `ACS_CONNECTION_STRING`, `ACS_WHATSAPP_NUMBER`, serta `ACS_CHANNEL_ID` (ID channel registration WhatsApp). Jika channel id berbeda dengan nomor, gunakan GUID dari portal Azure.
- Validasi manual: kirim pesan WhatsApp ke nomor ACS → periksa bahwa backend menerima payload dan menyimpan `chat_messages`; kirim balasan dari backend (`sendWhatsAppText`) dan cek status response ACS (jika gagal, catat HTTP status/body pada log).
- [ ] Outbound OTP via ACS; untuk media inbound, unduh dan unggah ke Blob via `blobService`.
