# Overview Integrasi & Urutan Implementasi Breathy

Dokumen ini menyusun urutan langkah integrasi yang jelas dan dapat dieksekusi dari lingkungan pengembangan lokal hingga produksi di Azure, berdasarkan arsitektur yang sudah didefinisikan. Fokusnya: apa yang dikerjakan dulu, layanan Azure mana yang perlu didaftarkan, bagaimana menghubungkan, dan bagaimana memverifikasi setiap tahap.

Catatan: Default arsitektur untuk MVP TIDAK menggunakan Azure Service Bus (ASB). Jalur dengan ASB disediakan sebagai opsi skalabilitas dan tercantum pada bagian opsional di akhir.

## Ringkasan Tahapan (High-Level Roadmap)

1) Prasyarat & Setup Lokal
2) Database & Skema Data
3) Skeleton Backend & Health Check
4) Azure Storage (Blob) & Media Pipeline
5) Azure Communication Services (WhatsApp) & Webhook
6) NLU (Copilot Studio/LUIS) & Vision (Cognitive Services)
7) Worker Pipeline (opsional – dengan Azure Service Bus)
8) Triage Engine & State Machine Wiring
9) Observabilitas (Application Insights) & Logging
10) Keamanan Awal (.env, JWT, RBAC Storage)
11) Deployment (Container, ACR, App Service) & Konfigurasi Produksi
12) Hardening (Key Vault, RBAC, Firewall) & Data Protection
13) Uji End-to-End & Cutover

Setiap tahap di bawah ini memiliki output yang bisa diverifikasi, agar progres terukur dan tidak merusak langkah berikutnya.

---

## 1) Prasyarat & Setup Lokal

Tujuan: Menyiapkan lingkungan developer yang konsisten.

- Pastikan Node.js LTS (>=18) dan paket manajer (npm/yarn) terpasang.
- Siapkan Postgres lokal (Docker atau instalasi lokal) atau gunakan Azure PostgreSQL untuk dev/staging.
- Opsional: Azurite (emulator Storage) untuk dev lokal; jika tidak, langsung gunakan Storage Azure.
- Buat file `.env` dari `.env.example` (jika belum ada, buat daftar variabel di bawah ini) dan masukkan placeholder.

Variabel lingkungan (contoh, sesuaikan dengan implementasi):

- APP_PORT, NODE_ENV, JWT_SECRET
- DATABASE_URL (PostgreSQL connection string)
- AZURE_STORAGE_CONNECTION_STRING, STORAGE_CONTAINER
- AZURE_CV_ENDPOINT, AZURE_CV_KEY (Computer Vision)
- COPILOT_ENDPOINT, COPILOT_KEY (atau LUIS/Language API)
- ACS_CONNECTION_STRING, ACS_WHATSAPP_NUMBER (untuk outbound)
- (opsional untuk ASB) SERVICE_BUS_CONNECTION_STRING, SB_INGEST_QUEUE, SB_AI_QUEUE, SB_NOTIFY_QUEUE
- APPINSIGHTS_CONNECTION_STRING
- TRIAGE_ALPHA, TRIAGE_THRESHOLDS (mis. 0.4|0.7)

Output verifikasi:

- Perintah run dev berjalan dan menampilkan konfigurasi minimum (tanpa bocor secrets) dan health check aktif.

---

## 2) Database & Skema Data

Tujuan: Menyediakan basis data dan skema minimal untuk menyimpan entitas kunci.

- Pilih ORM (Sequelize/Prisma) sesuai rencana. Implementasikan definisi model/tabel: users, cases, symptoms, images, doctors, doctor_actions, facilities, referrals, follow_ups, consent_logs.
- Buat dan jalankan migrasi pertama.
- Siapkan seed minimal (opsional) untuk facilities (contoh beberapa apotek/RS).

Output verifikasi:

- Tabel terbentuk. Koneksi DB dari aplikasi berhasil (log sukses/health DB OK).

---

## 3) Skeleton Backend & Health Check

Tujuan: Aplikasi Express online secara minimal.

- Buat `app.js` dengan middleware logger, error handler, dan endpoint `/healthz` (mengembalikan status OK dan, opsional, koneksi DB OK).
- Siapkan struktur folder sesuai desain (controllers, services, models, routes, middlewares, utils, config).
- Jalankan server lokal dan pastikan `/healthz` OK.

Output verifikasi:

- Endpoint `/healthz` merespons 200 OK. Log server hidup tanpa error.

---

## 4) Azure Storage (Blob) & Media Pipeline

Tujuan: Menyimpan media (foto WA) dan mengeluarkan URL (SAS) untuk inference.

- Provision Azure Storage Account dan buat container (mis. `breathy-images`).
- Buat peran akses (RBAC) minimal untuk upload dari backend. Untuk dev, gunakan connection string; untuk prod, gunakan Managed Identity.
- Implementasi `azure.js` (wrapper Storage) dan `visionService` agar dapat: upload file, membuat SAS URL, menyimpan metadata di tabel `images`.
- Buat utilitas QC (quality metrics placeholder) dan simpan ke kolom `quality_metrics` saat upload (meski metrik awal kosong, arsitektur siap).

Output verifikasi:

- Dapat mengunggah file dummy dan menyimpan record `images` (blob_url, sas/expiry, timestamps).

---

## 5) Azure Communication Services (WhatsApp) & Webhook

Tujuan: Menerima dan mengirim pesan WA.

- Provision Azure Communication Services (ACS). Aktifkan kanal WhatsApp (ikuti tahapan verifikasi Meta jika diperlukan; untuk sandbox gunakan nomor uji yang disediakan).
- Konfigurasikan inbound webhook ACS mengarah ke endpoint backend (mis. `POST /chat/incoming`). Untuk dev, gunakan tunneling (ngrok/Dev Tunnels) agar endpoint lokal publik.
- Implementasi `chatController` (mendeteksi teks vs media, mengekstrak metadata, menyimpan referensi ke `cases`, dan mem-publish ke antrian `ingest-queue` via messaging service).
- Implementasi outbound (opsional tahap ini): fungsi utilitas mengirim pesan teks ke user untuk konfirmasi OTP/follow-up.

Output verifikasi:

- Mengirim pesan WA dari perangkat → webhook menerima payload → record terkait user/case tersimpan.

---

## 6) NLU (Copilot Studio/LUIS) & Vision (Cognitive Services)

Tujuan: Mendapatkan skor S_s dan S_i terpisah.

- NLU: Siapkan Copilot Studio/LUIS dengan intent dan entitas (fever_status, onset_days, dyspnea, comorbidity, other_symptoms). Simpan endpoint + key di `.env`. Implementasi `nluService` untuk memanggil API dan normalisasi respon sesuai desain.
- Vision: Provision Azure Computer Vision. Simpan endpoint + key. Implementasi `visionService` untuk QC (blur/brightness) dan ekstraksi marker (warna, bercak darah, viskositas). Simpan skor dan metadata ke `images`.

Output verifikasi:

- Panggilan NLU pada teks contoh mengembalikan entitas + skor S_s tersimpan di `symptoms`.
- Panggilan Vision pada file contoh mengembalikan marker + skor S_i tersimpan di `images`.

---

## 7) Worker Pipeline (opsional – dengan Azure Service Bus)

Tujuan: Memisahkan ingestion, AI processing, dan notifikasi dengan antrian.

- Provision Service Bus Namespace dan buat 3 queue: `ingest-queue`, `ai-queue`, `notification-queue`.
- Implementasi `messagingService` (producer/consumer) dengan retry dan dead-letter awareness.
- Implementasi `ingestWorker`: konsumsi `ingest-queue`, bedakan teks/gambar → panggil `nluService`/`visionService` → simpan ke DB → kirim case_id ke `ai-queue`.
- Implementasi `triageWorker`: konsumsi `ai-queue`, cek ketersediaan `symptoms` & `images` → hitung S = α*S_i + (1-α)*S_s → update `cases.severity_*` dan `cases.status` → kirim event ke `notification-queue`.
- Implementasi `notifyWorker`: konsumsi `notification-queue` → kirim pesan status ke user/doctor (via ACS) atau e‑mail bila relevan.

Output verifikasi:

- Saat pesan WA masuk, alur data mengalir dari `ingest-queue` → NLU/Vision → `ai-queue` → triage → `notification-queue` → pesan keluar/sinyal ke dokter.

---

## 8) Triage Engine & State Machine Wiring

Tujuan: Menautkan perhitungan skor dengan perubahan state kasus.

- Implementasi `triageService` (hitung S_s, S_i, dan gabungan S; thresholds: Mild < 0.4, Moderate 0.4–0.7, Severe > 0.7; α dikonfigurasi).
- Kendalikan transisi `cases.status` sesuai tabel state machine (INIT → SEND_OTP → VERIFY_OTP → …). Buat helper untuk transisi idempoten dan audit log.
- Tambahkan endpoint/aksi dokter (`/cases/:id/doctor-review`) yang dapat mengubah severity/class dan memicu referral.

Output verifikasi:

- Kasus berpindah state sesuai input (OTP, gejala, gambar, review dokter) dan severity_class terbarui konsisten dengan skor S.

---

## 9) Observabilitas (Application Insights) & Logging

Tujuan: Telemetri siap untuk E2E troubleshooting.

- Provision Application Insights. Tambahkan SDK/telemetry ke app dan workers.
- Log metrik: state_transition_duration, queue_length, ai_response_time, doctor_action_latency, error rate. Tambahkan correlation ID per case.
- Buat alert standar (mis. backlog `ai-queue` > X, error ratio > Y).

Output verifikasi:

- Traces dan metrik muncul di portal Insights. Alert dapat diuji (threshold rendah sementara).

---

## 10) Keamanan Awal (.env, JWT, RBAC Storage)

Tujuan: Menjaga kredensial dan akses resource minimal aman.

- Gunakan JWT untuk endpoint dokter/dashboard; simpan `JWT_SECRET` di `.env` (nanti pindah ke Key Vault untuk prod).
- Terapkan RBAC minimal untuk Storage container (hindari SAS terlalu longgar di produksi).
- Pastikan sanitasi PII/PHI sebelum logging. Hindari menulis PII ke logs.

Output verifikasi:

- Endpoint dokter membutuhkan token. Upload media mengharuskan kredensial/identitas yang sah.

---

## 11) Deployment (Container, ACR, App Service)

Tujuan: Aplikasi berjalan di Azure App Service skala kecil dulu.

- Tambahkan Dockerfile multi-stage untuk app (dan workers jika proses terpisah) atau gunakan PM2/Procfile.
- Provision Azure Container Registry (ACR); build & push image.
- Provision Azure App Service (Linux) untuk API; set App Settings (semua env var yang diperlukan). Untuk workers, gunakan App Service tambahan atau Azure Container Apps.
- Hubungkan App Service ke Postgres/Storage/Service Bus dengan connection string di konfigurasi.
- Update webhook ACS agar mengarah ke domain App Service produksi/staging.

Output verifikasi:

- App Service online, `/healthz` 200 OK. Webhook menerima pesan dari ACS dan alur antrian berjalan.

---

## 12) Hardening (Key Vault, RBAC, Firewall) & Data Protection

Tujuan: Mengeraskan konfigurasi produksi.

- Provision Azure Key Vault dan pindahkan secrets (DB, ACS, CV, Service Bus, JWT). Gunakan Managed Identity untuk akses KV dari App Service.
- Atur firewall Postgres agar hanya menerima koneksi dari App Service/Private Endpoint.
- Review kebijakan retensi log; aktifkan enkripsi di Storage dan pastikan SAS scopes ketat.
- Implementasi audit logging untuk akses data sensitif (consent_logs, doctor_actions).

Output verifikasi:

- Secrets tidak berada di App Settings plaintext. Akses KV berhasil. Postgres/Storage tidak dapat diakses dari publik tanpa izin.

---

## 13) Uji End-to-End & Cutover

Tujuan: Memastikan jalur utama berfungsi dari WA hingga dokter.

- Skenario uji: 
	1) User kirim teks gejala → NLU → S_s → triage, 
	2) User kirim foto sputum → upload → Vision → S_i → triage,
	3) Kombinasi keduanya → notifikasi dokter → dokter review → rujukan/follow-up.
- Verifikasi data di tabel terkait (cases, symptoms, images, doctor_actions, referrals) dan telemetri di App Insights.
- Siapkan rollback sederhana (deploy image sebelumnya) dan rencana incident jika queue backlog menumpuk.

Output verifikasi:

- Semua jalur uji lulus. Tidak ada error kritis di logs. Metrik dalam batas normal.

---

## Catatan Alternatif: Tanpa Azure Service Bus

Jika memutuskan tidak menggunakan ASB (mis. arsitektur lebih sederhana di awal):

- Gantikan queue dengan eksekusi sinkron/asinkron terkoordinasi di proses backend atau gunakan job queue ringan (BullMQ + Redis). 
- `chatController` langsung memanggil `nluService`/`visionService` (atau menambah job di Redis queue). 
- `triageService` dipanggil setelah kedua hasil tersedia; simpan status antar hasil di DB (idempoten).
- Notifikasi dokter/user dipicu langsung setelah triage.

Konsekuensi:

- Lebih sederhana untuk MVP, tetapi skalabilitas & isolasi beban lebih rendah dibanding ASB. Migrasi ke ASB dapat dilakukan dengan menukar layer messagingService di kemudian hari.

---

## Checklist Kelulusan Integrasi (Go/No-Go)

- [ ] Health check, DB, dan Storage berjalan stabil di staging.
- [ ] WhatsApp inbound/outbound berfungsi (pesan teks dan media).
- [ ] NLU dan Vision mengembalikan skor, disimpan ke DB.
- [ ] Triage menghasilkan severity sesuai threshold, state machine konsisten.
- [ ] Notifikasi dokter/user terkirim sesuai event.
- [ ] Telemetri lengkap di Application Insights; alert dasar aktif.
- [ ] Secrets dikelola (Key Vault untuk prod), RBAC & firewall diterapkan.
- [ ] Rencana rollback siap, image stabil ditandai.

Dengan urutan ini, Anda dapat memulai dari komponen paling dasar (API dan data), lalu menambahkan integrasi Azure satu per satu, memverifikasi setiap langkah sebelum lanjut ke tahap berikutnya. Ini meminimalkan risiko dan memudahkan debug saat ada hambatan.
