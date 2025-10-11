# Prompt: Generate Image Pipeline (Storage + CV)

Rujukan: [../../design/database/schema.md](../../design/database/schema.md), [../../management/checklists/checklist_image_inference.md](../../management/checklists/checklist_image_inference.md)

Tujuan: Implement pipeline upload gambar → Azure Blob (@azure/storage-blob) → QC → panggil Computer Vision (@azure/cognitiveservices-computervision) → simpan marker + S_i.

Keluaran yang diharapkan:
- services/blobService.js, services/visionService.js.
- controllers/uploadController.js: POST /upload/image.
- tests untuk QC dan scoring.

Batasan:
- Tanpa komentar, camelCase, modul ringkas. Sanitasi metadata; simpan SAS URL dan expiry. Inisialisasi klien dari env AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, AZURE_CV_ENDPOINT, AZURE_CV_KEY.
