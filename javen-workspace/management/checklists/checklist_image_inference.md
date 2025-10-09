# Checklist Modul: Image Inference (Azure Computer Vision)

Rujukan: [design/architecture_overview.md](../../design/architecture_overview.md), [design/database/schema.md](../../design/database/schema.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Provision Azure Storage dan container media; set AZURE_STORAGE_CONNECTION_STRING.
- [ ] Implementasikan upload media, buat SAS URL, simpan metadata ke tabel images.
- [ ] QC dasar: blur, brightness, aspect ratio; minta unggah ulang jika tidak lolos.
- [ ] Panggil Azure CV untuk deteksi marker: sputum hijau, bercak darah, viskositas, jernih.
- [ ] Hitung S_i sesuai bobot; simpan skor & marker ke images.
- [ ] Sanitasi EXIF/PII; enkripsi di at-rest dan in-transit.

## Verifikasi

- [ ] Unggah file dummy menghasilkan record images lengkap.
- [ ] Hasil CV stabil pada sampel uji; thresholds terdokumentasi.
- [ ] Unit test untuk QC dan scoring.

## Catatan

- ...

## Target

- Target selesai: ...
