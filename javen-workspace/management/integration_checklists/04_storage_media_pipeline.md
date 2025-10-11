# 04 - Azure Storage & Media Pipeline

Rujukan: [overview_integration.md](../../overview_integration.md), [design/database/schema.md](../../design/database/schema.md)

## Tugas

- [ ] Provision Storage Account + container `breathy-images`.
- [ ] Instal `@azure/storage-blob`; set `.env` AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER.
- [ ] Implement `blobService` wrapper (upload → blob → simpan images record) + SAS URL.
- [ ] QC placeholder dan penyimpanan quality_metrics.
- [ ] Uji unggah file dummy end-to-end.

## Verifikasi

- [ ] Record images menyimpan blob_url, sas, expiry, metadata.

## Catatan

- ...
