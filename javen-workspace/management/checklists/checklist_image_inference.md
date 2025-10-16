# Checklist Modul: Image Inference (GPT-4o Vision)

Rujukan: [design/architecture_overview.md](../../design/architecture_overview.md), [design/database/schema.md](../../design/database/schema.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [x] Instal SDK `openai` (digunakan juga untuk vision multimodal GPT-4o) dan `@azure/storage-blob`.
- [x] Set `.env` AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, OPENAI_KEY, OPENAI_MODEL.
- [x] Implement upload media flow: `POST /cases/:caseId/images/upload-url` (SAS PUT) + `POST /cases/:caseId/images` untuk finalisasi metadata.
- [x] Simpan metadata ke tabel images melalui `blobService` (`blob_name`, `content_type`, `file_size_bytes`, `source`, `qc_status`).
- [ ] QC dasar: blur, brightness, aspect ratio; minta unggah ulang jika tidak lolos.
- [x] Panggil GPT-4o vision (image_url) untuk deteksi marker: sputum hijau, bercak darah, viskositas, jernih + ringkasan klinis.
- [x] Hitung S_i sesuai bobot; simpan skor & marker ke images dan `cases.triage_metadata`.
- [ ] Sanitasi EXIF/PII; enkripsi di at-rest dan in-transit.

## Verifikasi

- [ ] Unggah file dummy menghasilkan record images lengkap (list GET memberikan SAS baru saat diminta).
- [ ] Hasil GPT-4o stabil pada sampel uji; thresholds & prompt terdokumentasi.
- [ ] Unit test untuk QC dan scoring.
- [ ] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

- ## Catatan

- Storage Blob SDK terpasang, namun kredensial Azure belum tersedia sehingga endpoint hanya siap setelah konfigurasi env diisi.
- GPT-4o vision menghasilkan marker + summary; QC blur/brightness masih pending sehingga checklist belum selesai sepenuhnya.

## Target

- Target selesai: ...
