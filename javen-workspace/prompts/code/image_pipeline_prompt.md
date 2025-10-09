# Prompt: Generate Image Pipeline (Storage + CV)

Rujukan: [../../design/database/schema.md](../../design/database/schema.md), [../../management/checklists/checklist_image_inference.md](../../management/checklists/checklist_image_inference.md)

Tujuan: Implement pipeline upload gambar → Azure Blob → QC → panggil Computer Vision → simpan marker + S_i.

Keluaran yang diharapkan:
- services/storageService.js, services/visionService.js.
- controllers/uploadController.js: POST /upload/image.
- tests untuk QC dan scoring.

Batasan:
- Sanitasi metadata; simpan SAS URL dan expiry.
