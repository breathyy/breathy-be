# 06 - NLU (Azure AI Text Analytics) & Vision (Computer Vision)

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Instal paket SDK: `@azure/ai-text-analytics`, `@azure/cognitiveservices-computervision`.
- [ ] Set `.env`: AI_TEXT_ENDPOINT, AI_TEXT_KEY, AZURE_CV_ENDPOINT, AZURE_CV_KEY.
- [x] Implement `nluService` dengan SDK untuk ekstraksi entitas dan perhitungan S_s.
- [x] Implement `visionService` dengan SDK untuk QC dasar, ekstraksi marker, dan S_i.
- [x] Simpan hasil ke DB (symptoms, images) dan log observabilitas.
 - [ ] Dokumentasikan bobot dan thresholds sesuai desain algoritma; simpan di konfigurasi.

## Verifikasi

- [ ] Teks contoh → entitas + S_s; gambar contoh → marker + S_i.
- [ ] Uji error handling dan latency; log ke App Insights bila diaktifkan.

## Catatan

- `nluService` kini menyimpan hasil ekstraksi gejala dan skor S_s saat webhook teks diterima; layanan memerlukan AI_TEXT_* env agar tidak fallback ke error metadata.
- Vision service kini memanggil Azure Computer Vision ketika kredensial dan SAS download tersedia; fallback lokal tetap aktif bila konfigurasi belum lengkap.
