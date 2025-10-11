# 04 - Azure Storage & Media Pipeline

Rujukan: [overview_integration.md](../../overview_integration.md), [design/database/schema.md](../../design/database/schema.md)

## Tugas

- [ ] Provision Storage Account + container `breathy-images` (RBAC: backend app identity sebagai Storage Blob Data Contributor).
- [ ] Instal `@azure/storage-blob`; set `.env` AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER.
- [ ] Implement `blob.service.js` (generate SAS PUT, generate SAS GET singkat, delete blob, helper metadata).
- [ ] Tambah controller/route: `POST /cases/:caseId/images/upload-url`, `POST /cases/:caseId/images`, `GET /cases/:caseId/images`.
- [ ] QC placeholder dan penyimpanan `qc_status` + `quality_metrics`.
- [ ] Jalankan Vision stub (mock) untuk mengisi `markers` dan `s_i` bila tersedia.
- [ ] Uji unggah file dummy end-to-end (dari permintaan SAS hingga finalisasi DB).

## Verifikasi

- [ ] Record images menyimpan blob_name, blob_url, content_type, file_size_bytes, qc_status, markers/s_i.
- [ ] SAS upload PUT valid <=15 menit; GET images mengembalikan SAS baru tiap request.

## Catatan

- ...
