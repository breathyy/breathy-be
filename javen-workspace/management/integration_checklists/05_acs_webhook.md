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

- Endpoint `/chat/incoming` kini memanggil `chatService.processIncomingMessage`; ACS masih belum dikonfigurasi sehingga pengujian menunggu kredensial dan tunnel publik.
- Stub outbound util tersedia di `src/services/acs.service.js`; fungsi `sendWhatsAppText` menyiapkan payload dan mencatat pesan keluar sebagai pending sampai kredensial ACS aktif. Endpoint OTP memakai util ini dengan opsi dry-run bila ACS belum siap.
- [ ] Instal ACS SDK atau gunakan REST sebagai fallback; set `.env` ACS_CONNECTION_STRING, ACS_WHATSAPP_NUMBER.
- [ ] Outbound OTP via ACS; untuk media inbound, unduh dan unggah ke Blob via `blobService`.
