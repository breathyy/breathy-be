# Prompt: Generate Image Pipeline (Storage + CV)

Rujukan: [../../design/database/schema.md](../../design/database/schema.md), [../../management/checklists/checklist_image_inference.md](../../management/checklists/checklist_image_inference.md)

Tujuan: Implement pipeline upload gambar → Azure Blob (@azure/storage-blob) → QC → panggil Computer Vision (@azure/cognitiveservices-computervision) → simpan marker + S_i.

Keluaran yang diharapkan:
- services/blob.service.js (SAS PUT/GET helper, delete, metadata builder), services/vision.service.js (stub Vision call).
- controllers/media.controller.js dan routes/case-images.route.js (POST /cases/:caseId/images/upload-url, POST /cases/:caseId/images, GET /cases/:caseId/images).
- middlewares/upload-guard.middleware.js untuk validasi contentType/fileSize.
- tests untuk QC dan scoring + route contract (mock Blob/Vision).

Batasan:
- Tanpa komentar, camelCase, modul ringkas. Sanitasi metadata; simpan blobName + metadata, SAS GET dibuat per request dengan TTL <=15 menit. Inisialisasi klien dari env AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, AZURE_CV_ENDPOINT, AZURE_CV_KEY.
