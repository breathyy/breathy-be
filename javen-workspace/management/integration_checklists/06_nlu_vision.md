# 06 - NLU (OpenAI) & Vision (GPT-4o Inference)

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Instal paket SDK: `openai` (dipakai untuk teks & vision GPT-4o).
- [x] Set `.env`: OPENAI_KEY, OPENAI_MODEL; tandai bahwa Azure CV tidak lagi digunakan.
- [x] Implement `nluService` dengan OpenAI Chat Completions + fallback heuristik untuk perhitungan S_s.
- [x] Implement `visionService` yang memanfaatkan GPT-4o multimodal (image_url) dan fallback manual markers untuk S_i.
- [x] Simpan hasil ke DB (symptoms, images) dan perbarui `cases.triage_metadata` dengan dataCompleteness.
- [ ] Dokumentasikan bobot dan thresholds sesuai desain algoritma; simpan di konfigurasi.

## Verifikasi

- [x] Teks contoh → entitas + S_s (uji manual via `chat.service.processIncomingMessage` menggunakan payload teks; cek tabel `symptoms` + `cases.triage_metadata`).
- [ ] Gambar contoh → marker + S_i (butuh URL publik; gunakan GPT-4o vision dan pastikan `images.markers` terisi dengan confidence & rationale).
- [ ] Uji error handling dan latency; log ke App Insights bila diaktifkan.

## Catatan

- `nluService` kini menyimpan hasil ekstraksi gejala dan skor S_s saat webhook teks diterima; layanan membutuhkan OPENAI_* env agar tidak hanya mengandalkan heuristik fallback.
- Vision service kini memakai GPT-4o multimodal (via `image_url`) untuk menghasilkan markers + ringkasan; fallback manual markers tetap tersedia jika URL/akses API gagal.
- Ketika sukses, metadata GPT-4o disimpan ke `images.markers` dan `cases.triage_metadata.lastVisionAnalysis`, termasuk sputumCategory dan dataCompleteness.
