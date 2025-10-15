# Checklist Modul: Image Inference (Azure Computer Vision)

Rujukan: [design/architecture_overview.md](../../design/architecture_overview.md), [design/database/schema.md](../../design/database/schema.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Instal `@azure/storage-blob` dan `@azure/cognitiveservices-computervision`.
- [ ] Set `.env` AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, AZURE_CV_ENDPOINT, AZURE_CV_KEY.
- [x] Implement upload media flow: `POST /cases/:caseId/images/upload-url` (SAS PUT) + `POST /cases/:caseId/images` untuk finalisasi metadata.
- [x] Simpan metadata ke tabel images melalui `blobService` (`blob_name`, `content_type`, `file_size_bytes`, `source`, `qc_status`).
- [ ] QC dasar: blur, brightness, aspect ratio; minta unggah ulang jika tidak lolos.
- [ ] Panggil Azure CV untuk deteksi marker: sputum hijau, bercak darah, viskositas, jernih.
- [x] Hitung S_i sesuai bobot; simpan skor & marker ke images.
- [ ] Sanitasi EXIF/PII; enkripsi di at-rest dan in-transit.

## Verifikasi

- [ ] Unggah file dummy menghasilkan record images lengkap (list GET memberikan SAS baru saat diminta).
- [ ] Hasil CV stabil pada sampel uji; thresholds terdokumentasi.
- [ ] Unit test untuk QC dan scoring.
- [ ] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

- ## Catatan

- Storage Blob SDK terpasang, namun kredensial Azure belum tersedia sehingga endpoint hanya siap setelah konfigurasi env diisi.
- Vision stub menghitung `s_i` berbasis bobot desain jika markers tersedia; integrasi Azure Computer Vision dan QC blur/brightness tetap pending.

## Target

- Target selesai: ...
