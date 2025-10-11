# 06 - NLU (Azure AI Text Analytics) & Vision (Computer Vision)

Rujukan: [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Instal paket SDK: `@azure/ai-text-analytics`, `@azure/cognitiveservices-computervision`.
- [ ] Set `.env`: AI_TEXT_ENDPOINT, AI_TEXT_KEY, AZURE_CV_ENDPOINT, AZURE_CV_KEY.
- [ ] Implement `nluService` dengan SDK untuk ekstraksi entitas dan perhitungan S_s.
- [ ] Implement `visionService` dengan SDK untuk QC dasar, ekstraksi marker, dan S_i.
- [ ] Simpan hasil ke DB (symptoms, images) dan log observabilitas.
 - [ ] Dokumentasikan bobot dan thresholds sesuai desain algoritma; simpan di konfigurasi.

## Verifikasi

- [ ] Teks contoh → entitas + S_s; gambar contoh → marker + S_i.
- [ ] Uji error handling dan latency; log ke App Insights bila diaktifkan.

## Catatan

- ...
