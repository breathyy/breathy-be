# Ikhtisar Arsitektur Breathy (Backend)

Backend menggunakan Node.js/Express dengan PostgreSQL, Azure Blob Storage, Azure Communication Services (WhatsApp), Azure Cognitive Services Vision, dan Azure AI Text Analytics. Orkestrasi dilakukan langsung di proses backend menggunakan pemanggilan async, tanpa message broker. State machine kasus: IN_CHATBOT → WAITING_DOCTOR → MILD/MODERATE/SEVERE; severity_class adalah hasil triage.

Komponen utama
- API/Express: routes untuk chat webhook, kasus, dokter/RS, tugas harian, auth, media (SAS upload/list)
- PostgreSQL: users, doctor_users, hospital_users, hospitals, cases, images, symptoms, daily_tasks, referrals, chat_messages, otp_codes
- Blob pipeline: upload ke Blob, QC, SAS URL jangka pendek, inferensi Vision, finalisasi metadata di tabel `images`
- NLU & Vision: hitung S_s dan S_i, gabungkan menjadi S
- Observabilitas: Application Insights (opsional)
- Keamanan: JWT/RBAC, sanitasi PII, Key Vault untuk secrets (opsional)

Layanan SDK (Node modules)
- communicationService: Azure Communication Services WhatsApp (SDK, fallback REST)
- blobService: @azure/storage-blob untuk upload, SAS, listing metadata
- dbService: pg/ORM untuk koneksi PostgreSQL dan query
- visionService: @azure/cognitiveservices-computervision untuk analisis gambar
- nluService: @azure/ai-text-analytics untuk entitas gejala
- keyVaultService (opsional): @azure/keyvault-secrets + identity untuk secrets
- appInsightsService (opsional): applicationinsights untuk telemetry

Autentikasi & konfigurasi
- ENV: ACS_CONNECTION_STRING, ACS_WHATSAPP_NUMBER, AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER, DATABASE_URL, AZURE_CV_ENDPOINT, AZURE_CV_KEY, AI_TEXT_ENDPOINT, AI_TEXT_KEY, APPINSIGHTS_CONNECTION_STRING, TRIAGE_ALPHA, TRIAGE_THRESHOLDS
- Fallback REST: pakai endpoint+key ketika SDK tidak tersedia

Inisialisasi klien (pseudo‑code tanpa komentar)
```
import { ClientSecretCredential } from '@azure/identity'
import { BlobServiceClient } from '@azure/storage-blob'
import { TextAnalyticsClient, AzureKeyCredential } from '@azure/ai-text-analytics'
import { ComputerVisionClient } from '@azure/cognitiveservices-computervision'
import { DefaultAzureCredential } from '@azure/identity'
import { Client } from 'pg'

const blob = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
const ta = new TextAnalyticsClient(process.env.AI_TEXT_ENDPOINT, new AzureKeyCredential(process.env.AI_TEXT_KEY))
const cv = new ComputerVisionClient({ endpoint: process.env.AZURE_CV_ENDPOINT }, { key: process.env.AZURE_CV_KEY })
const db = new Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
```

Alur data
- Inbound WhatsApp via ACS -> webhook Express -> simpan chat, buat/temukan case
- Unggahan manual via dashboard/pasien -> POST /cases/:id/images/upload-url (SAS PUT) -> klien unggah langsung -> POST /cases/:id/images finalisasi metadata, QC -> Vision -> simpan markers, S_i
- Gambar diunduh via ACS media URL -> upload ke Blob -> QC -> Vision -> simpan markers, S_i (alur sinkron)
- Teks gejala → Text Analytics → entitas terstruktur → S_s
- Ensemble triage S = α·S_i + (1−α)·S_s → set severity_score, severity_class → tunggu review dokter
- Approval dokter → generate tugas harian 7 hari untuk MILD/MODERATE → rujukan jika SEVERE

Lihat juga: [./algorithms/ensemble_triage.md](./algorithms/ensemble_triage.md), [./api/api_specification.md](./api/api_specification.md), [./database/schema.md](./database/schema.md).
