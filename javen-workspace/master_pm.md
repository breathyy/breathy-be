# Prompt Master untuk Proyek Breathy

Dokumen ini adalah megaprompt kerja bagi agen AI yang menyiapkan struktur dan isi direktori design, management, dan prompts untuk proyek Breathy, sekaligus mengelola progres implementasi berbasis checklist.

## Daftar Isi

- [1. Persiapan Bacaan](#1-persiapan-bacaan)
- [2. Direktori design/](#2-direktori-design)
- [3. Direktori management/](#3-direktori-management)
	- [3.1 Checklist Per Modul](#31-checklist-per-modul)
	- [3.2 Checklist Tahapan Integrasi](#32-checklist-tahapan-integrasi)
	- [3.3 overall_progress.md](#33-overall_progressmd)
	- [3.4 roles_and_responsibilities.md (opsional)](#34-roles_and_responsibilitiesmd-opsional)
- [4. Direktori prompts/](#4-direktori-prompts)
- [5. Pedoman Umum](#5-pedoman-umum)
- [6. Hasil Akhir](#6-hasil-akhir)

---

## 1. Persiapan Bacaan

Anda adalah agen AI yang mempersiapkan proyek Breathy. Tugas Anda adalah membaca dokumen desain dan manajemen yang tersedia ([overview_design.md](./overview_design.md), [overview_integration.md](./overview_integration.md)), kemudian menghasilkan keseluruhan folder design, management, dan prompts berikut isi rinciannya. Sistem manajemen berbasis checklist meliputi dua dimensi: 1) checklist per modul/fungsi, 2) checklist per tahap integrasi sesuai urutan implementasi.

- Buka dan pahami blueprint Breathy beserta overview manajemen. Catat alur state machine, model data, algoritma AI, dan peran masing‑masing layanan Azure.
- Baca [overview_integration.md](./overview_integration.md) untuk melihat roadmap 13 tahap pengembangan: dari setup lokal, pengaturan database, skeleton backend, integrasi Storage dan ACS, NLU & Vision, antrian & worker pipeline, wiring triage engine, observabilitas, keamanan, deployment, hingga hardening dan uji end‑to‑end.

## 2. Direktori design/

Instruksi sama seperti versi sebelumnya; membuat arsitektur, database, api, algorithms, security, dan lainnya dengan detail lengkap serta sitasi sesuai blueprint.


## 3. Direktori management/

### 3.1 Checklist Per Modul

Buat subfolder `checklists/` yang berisi satu file untuk setiap modul utama Breathy. Setiap file (misal: `checklist_triage_bot.md`, `checklist_nlu.md`, `checklist_image_inference.md`, `checklist_geolocation.md`, `checklist_doctor_dashboard.md`, `checklist_followup_engine.md`, `checklist_security.md`) berisi:

- Daftar tugas granular untuk membangun modul tersebut (misal: “implementasikan state INIT dan OTP”, “integrasikan Copilot Studio”, “buat API GET /doctor/cases”, “implementasikan login dokter”).
- Kolom status (To Do, In Progress, Done).
- Kolom catatan (temuan, masalah, solusi).
- Tanggal target atau catatan progres.

Checklist ini menjadi memori bagi AI tentang progres tiap fungsi.

### 3.2 Checklist Tahapan Integrasi

Selain per modul, buat file `checklist_integration_flow.md` atau sebuah folder `integration_checklists/` yang berisi checklist sesuai urutan 13 tahap di [overview_integration.md](./overview_integration.md):

1. `01_setup_local.md` – mencatat tugas seperti instalasi Node.js, setup Postgres, membuat file .env, memverifikasi bahwa `npm run dev` berjalan.
2. `02_database_schema.md` – tugas membuat model, migrasi, seeding initial data, dan verifikasi koneksi DB.
3. `03_skeleton_backend.md` – tugas menyiapkan server Express dengan endpoint `/healthz`, struktur folder, middleware dasar.
4. `04_storage_media_pipeline.md` – tugas provisioning Blob Storage, membuat wrapper upload, QC, dan verifikasi penyimpanan file.
5. `05_acs_webhook.md` – tugas mengaktifkan kanal WhatsApp di ACS, menyiapkan webhook `/chat/incoming`, dan mengirim/menerima pesan uji.
6. `06_nlu_vision.md` – tugas pengaturan Copilot Studio dan Computer Vision, implementasi `nluService` & `visionService`, serta uji inference.
7. `07_queue_pipeline.md` – (opsional untuk skala) tugas provisioning queue, menulis worker, memproses alur ingest → AI → notify. Jika arsitektur tanpa bus (default MVP), gunakan adaptasi sesuai catatan di `overview_integration.md`.
8. `08_triage_engine.md` – tugas implementasi triage engine & state machine, update `cases.status`.
9. `09_observability.md` – tugas mengintegrasikan Application Insights, menyiapkan logging & alerting.
10. `10_security_initial.md` – tugas implementasi JWT, RBAC Storage, sanitasi PII, dan konfigurasi `.env`.
11. `11_deployment.md` – tugas menulis Dockerfile, membuat ACR, App Service, dan mengkonfigurasi env di staging/production.
12. `12_hardening.md` – tugas pemindahan secret ke Key Vault, memperketat RBAC, firewall, enkripsi.
13. `13_end_to_end_testing.md` – tugas menyiapkan skrip uji end‑to‑end, memverifikasi alur lengkap dari chat hingga notifikasi dan rujukan.

Setiap file checklist tahap integrasi harus memecah tugas besar menjadi langkah-langkah rinci yang bisa diperiksa satu per satu, dan memuat kolom status serta catatan. Dengan demikian AI bisa melacak progres implementasi tidak hanya pada level modul, tetapi juga pada level integrasi sistem.

### 3.3 overall_progress.md

Buat `overall_progress.md` yang merangkum status seluruh modul dan tahap implementasi. File ini berisi:

- Persentase penyelesaian masing‑masing checklist modul dan integrasi.
- Milestone tercapai (mis. “Database migrasi selesai”, “Webhook ACS terhubung”).
- Hambatan yang ditemui dan rencana mitigasi.
- Rekomendasi prioritas untuk sprint berikutnya.

### 3.4 roles_and_responsibilities.md (opsional)

Jika diperlukan, definisikan peran (Product Owner, AI Developer, Dokter Advisor, QA, DevOps) beserta tanggung jawab mereka dalam memeriksa dan memperbarui checklist.

## 4. Direktori prompts/

Tetap sama seperti versi sebelumnya, namun prompt manajemen juga harus memanfaatkan checklist tahapan integrasi.

- `prompts/code/`: Sediakan prompt per modul (generate auth module, triage service, NLU service, image pipeline, geolocation, doctor dashboard, follow‑up engine, security middleware). Setiap prompt harus merujuk dokumen design yang relevan dan checklist modul terkait.
- `prompts/management/`: Sediakan prompt seperti `update_checklist_prompt.md` yang memandu AI untuk menandai tugas selesai pada checklist modul maupun integrasi, serta `review_progress_prompt.md` untuk merangkum progres dan mengisi `overall_progress.md`. Tambahkan prompt `integrate_next_stage_prompt.md` yang memandu AI berpindah ke tahap berikutnya dalam flow implementasi setelah tahap sebelumnya selesai.

## 5. Pedoman Umum

- Berikan penjelasan yang sangat rinci dalam setiap dokumen design, checklist, dan prompt. Gunakan sitasi dari sumber PDF Breathy untuk mendukung perhitungan skor dan alur state machine.
- Gunakan bahasa Indonesia yang baku, hindari tabel untuk deskripsi panjang; gunakan paragraf yang jelas.
- Kaitkan dokumen satu sama lain dengan tautan relatif. Contoh: di prompt untuk `triageService`, rujuk `../design/algorithms/ensemble_triage.md` dan `../management/checklists/checklist_triage_bot.md`.
- Pastikan setiap perubahan desain akibat penghapusan Service Bus tercermin dalam checklist dan prompt, terutama pada bagian pipeline antrian.

## 6. Hasil Akhir

Setelah mengikuti megaprompt ini, agen AI harus menghasilkan:

- Direktori `design/` dengan subfolder architecture, database, api, algorithms, security, dan lainnya, berisi dokumen teknis mendetail.
- Direktori `management/` berisi `checklists/` per modul, `integration_checklists/` per tahap implementasi (atau sebuah file `checklist_integration_flow.md`), `overall_progress.md`, dan opsi `roles_and_responsibilities.md`.
- Direktori `prompts/` berisi prompt kode untuk setiap modul serta prompt manajemen untuk memperbarui checklist dan progres.

File‑file tersebut saling merujuk dan dapat digunakan oleh AI untuk melanjutkan pekerjaan secara mandiri sambil memantau progres internal melalui checklist.
Anda adalah agen AI yang mempersiapkan proyek Breathy. Tugas Anda adalah membaca dokumen yang tersedia (`overview_design.md`, `overview_integration.md`) lalu menghasilkan keseluruhan folder design, management, dan prompts berikut isi rinciannya. Sistem manajemen berbasis checklist meliputi dua dimensi: 1) checklist per modul/fungsi, 2) checklist per tahap integrasi sesuai urutan implementasi.

1. Persiapan Bacaan

Buka dan pahami blueprint Breathy beserta overview manajemen. Catat alur state machine, model data, algoritma AI, dan peran masing‑masing layanan Azure.

Baca overview_integration.md untuk melihat roadmap 13 tahap pengembangan: dari setup lokal, pengaturan database, skeleton backend, integrasi Storage dan ACS, NLU & Vision, antrian & worker pipeline, wiring triage engine, observabilitas, keamanan, deployment, hingga hardening dan uji end‑to‑end.

2. Direktori design/

(instruksi sama seperti versi sebelumnya; membuat arsitektur, database, api, algorithms, security, dll. dengan detail lengkap dan sitasi sesuai blueprint)

3. Direktori management/
3.1 Checklist Per Modul

Buat subfolder checklists/ yang berisi satu file untuk setiap modul utama Breathy. Setiap file (misal checklist_triage_bot.md, checklist_nlu.md, checklist_image_inference.md, checklist_geolocation.md, checklist_doctor_dashboard.md, checklist_followup_engine.md, checklist_security.md) berisi:

Daftar tugas granular untuk membangun modul tersebut (misal: “implementasikan state INIT dan OTP”, “integrasikan Copilot Studio”, “buat API GET /doctor/cases”, “implementasikan login dokter”).

Kolom status (To Do, In Progress, Done).

Kolom catatan (temuan, masalah, solusi).

Tanggal target atau catatan progres.

Checklist ini menjadi memori bagi AI tentang progres tiap fungsi.

3.2 Checklist Tahapan Integrasi

Selain per modul, buat file checklist_integration_flow.md atau sebuah folder integration_checklists/ yang berisi checklist sesuai urutan 13 tahap di overview_integration.md:

01_setup_local.md – mencatat tugas seperti instalasi Node.js, setup Postgres, membuat file .env, memverifikasi bahwa npm run dev berjalan.

02_database_schema.md – tugas membuat model, migrasi, seeding initial data, dan verifikasi koneksi DB.

03_skeleton_backend.md – tugas menyiapkan server Express dengan endpoint /healthz, struktur folder, middleware dasar.

04_storage_media_pipeline.md – tugas provisioning Blob Storage, membuat wrapper upload, QC, dan verifikasi penyimpanan file.

05_acs_webhook.md – tugas mengaktifkan kanal WhatsApp di ACS, menyiapkan webhook /chat/incoming, dan mengirim/ menerima pesan uji.

06_nlu_vision.md – tugas pengaturan Copilot Studio dan Computer Vision, implementasi nluService & visionService, serta uji inference.

07_queue_pipeline.md – (jika arsitektur menggunakan Service Bus) tugas provisioning queue, menulis worker, memproses alur ingest → AI → notify. Jika arsitektur tanpa bus (default), ikuti adaptasi pada bagian tanpa-ASB di `overview_integration.md`.

08_triage_engine.md – tugas implementasi triage engine & state machine, update cases.status.

09_observability.md – tugas mengintegrasikan Application Insights, menyiapkan logging & alerting.

10_security_initial.md – tugas implementasi JWT, RBAC Storage, sanitasi PII, dan konfigurasi .env.

11_deployment.md – tugas menulis Dockerfile, membuat ACR, App Service, dan mengkonfigurasi env di staging/production.

12_hardening.md – tugas pemindahan secret ke Key Vault, memperketat RBAC, firewall, enkripsi.

13_end_to_end_testing.md – tugas menyiapkan skrip uji end‑to‑end, memverifikasi alur lengkap dari chat hingga notifikasi dan rujukan.

Setiap file checklist tahap integrasi harus memecah tugas besar menjadi langkah-langkah rinci yang bisa diperiksa satu per satu, dan memuat kolom status serta catatan. Dengan demikian AI bisa melacak progres implementasi tidak hanya pada level modul, tetapi juga pada level integrasi sistem.

3.3 overall_progress.md

Buat overall_progress.md yang merangkum status seluruh modul dan tahap implementasi. File ini berisi:

Persentase penyelesaian masing‑masing checklist modul dan integrasi.

Milestone tercapai (mis. “Database migrasi selesai”, “Webhook ACS terhubung”).

Hambatan yang ditemui dan rencana mitigasi.

Rekomendasi prioritas untuk sprint berikutnya.

3.4 roles_and_responsibilities.md (opsional)

Jika diperlukan, definisikan peran (Product Owner, AI Developer, Dokter Advisor, QA, DevOps) beserta tanggung jawab mereka dalam memeriksa dan memperbarui checklist.

4. Direktori prompts/

(tetap sama seperti versi sebelumnya, namun prompt manajemen juga harus memanfaatkan checklist tahapan integrasi)

prompts/code/: Sediakan prompt per modul (generate auth module, triage service, NLU service, image pipeline, geolocation, doctor dashboard, follow‑up engine, security middleware). Setiap prompt harus merujuk dokumen design yang relevan dan checklist modul terkait.

prompts/management/: Sediakan prompt seperti update_checklist_prompt.md yang memandu AI untuk menandai tugas selesai pada checklist modul maupun integrasi, serta review_progress_prompt.md untuk merangkum progres dan mengisi overall_progress.md. Tambahkan prompt integrate_next_stage_prompt.md yang memandu AI berpindah ke tahap berikutnya dalam flow implementasi setelah tahap sebelumnya selesai.

5. Pedoman Umum

Berikan penjelasan yang sangat rinci dalam setiap dokumen design, checklist, dan prompt. Gunakan sitasi dari sumber PDF Breathy untuk mendukung perhitungan skor dan alur state machine.

Gunakan bahasa Indonesia yang baku, hindari tabel untuk deskripsi panjang; gunakan paragraf yang jelas.

Kaitkan dokumen satu sama lain dengan tautan relatif. Contoh: di prompt untuk triageService, rujuk ../design/algorithms/ensemble_triage.md dan ../management/checklists/checklist_triage_bot.md.

Pastikan setiap perubahan desain akibat penghapusan Service Bus tercermin dalam checklist dan prompt, terutama pada bagian pipeline antrian.

6. Hasil Akhir

Setelah mengikuti megaprompt ini, agen AI harus menghasilkan:

Direktori design/ dengan subfolder architecture, database, api, algorithms, security, dst., berisi dokumen teknis mendetail.

Direktori management/ berisi checklists/ per modul, integration_checklists/ per tahap implementasi (atau sebuah file checklist_integration_flow.md), overall_progress.md, dan opsi roles_and_responsibilities.md.

Direktori prompts/ berisi prompt kode untuk setiap modul serta prompt manajemen untuk memperbarui checklist dan progres.

File‑file tersebut saling merujuk dan dapat digunakan oleh AI untuk melanjutkan pekerjaan secara mandiri sambil memantau progres internal melalui checklist.
































# Overview Manajemen Pengembangan Breathy dengan AI Codex

File ini mendefinisikan kerangka kerja manajemen proyek yang dirancang untuk memfasilitasi kolaborasi antara manusia dan agen AI (misal GPT‑5 Codex) dalam membangun aplikasi backend Breathy. Sistem ini menata seluruh artefak ke dalam tiga direktori utama—design, management, dan prompts—dan menjabarkan alur kerja, tanggung jawab, serta mekanisme umpan balik agar AI dapat menghasilkan desain, kode, dan rencana manajemen secara bertahap dan terstruktur.

## Struktur Direktori

### /design

Menampung dokumen desain teknis dan fungsional. Dokumen di sini menjadi referensi utama bagi AI saat menulis kode. Subfolder yang disarankan:

- architecture/: diagram arsitektur, flowchart, dan deskripsi modul.
- database/: model data, skema tabel, ERD, dan migrasi.
- api/: spesifikasi endpoint (path, method, payload, respons).
- algorithms/: penjelasan algoritma (NLU, CV, triage, geolokasi).
- security/: panduan privasi, enkripsi, RBAC.

Setiap file harus dalam format Markdown yang terstruktur dengan judul, subjudul, dan tabel jika diperlukan.

### /management

Berisi artefak manajemen proyek yang memastikan pekerjaan berjalan sesuai metodologi agile. Contohnya:

- backlog.md: daftar fitur, user story, prioritas, dan estimasi poin.
- sprint_plan.md: rencana sprint berjalan (goal, item backlog terpilih, durasi).
- status_board.md: papan Kanban dengan kolom To Do, In Progress, Review, Done.
- checklist.md: daftar periksa compliance (privasi, keamanan, pengujian) yang harus dicek sebelum rilis.
- meeting_notes/: catatan retrospective atau daily stand‑up.

Dokumen ini memandu AI saat mengambil keputusan manajerial, misalnya memilih fitur mana yang diprioritaskan atau menilai kesiapan rilis.

### /prompts

Menyimpan teks prompt siap pakai yang akan digunakan untuk memandu AI menghasilkan kode atau dokumen. Memiliki dua jenis:

- Prompts untuk kode – misalnya generate_route_prompt.md, create_model_prompt.md. Setiap file mendeskripsikan tugas spesifik (contoh: “Buat file services/triageService.js berdasarkan design/algorithms/triage.md dan design/database/schema.md. Pastikan menggunakan async/await, menangani error, dan mengekspor fungsi calculateSeverity.”).
- Prompts untuk manajemen – misalnya update_backlog_prompt.md untuk meminta AI mengurai kebutuhan baru dan menambahkannya ke backlog, atau sprint_review_prompt.md untuk merangkum kemajuan sprint dan mengidentifikasi hambatan.

Setiap prompt harus menyertakan konteks: rujukan ke dokumen desain relevan, batasan (mis. “maksimal 100 baris kode”), dan format output yang diharapkan.

## Alur Kerja AI dan Manusia

- Persiapan Desain – Tim manusia menulis dokumen di folder design berdasarkan visi produk (misalnya blueprint Breathy). Dokumen harus cukup rinci sehingga AI dapat mengimplementasikan kode tanpa asumsi. Jika ada perubahan, dokumen ini yang diperbarui terlebih dahulu.
- Pemetaan Backlog – Product Owner (manusia) mengonversi kebutuhan dari design ke user story di management/backlog.md, menambahkan prioritas dan estimasi. AI dapat membantu menyarankan pembagian modul atau urutan pengerjaan berdasarkan kompleksitas.
- Pembuatan Prompt – Untuk setiap modul yang akan dikode, tim menulis file prompt baru dalam prompts/code yang:
	- Menjelaskan secara ringkas apa yang harus dilakukan.
	- Menyertakan referensi ke dokumen desain yang relevan.
	- Menyebutkan nama file output (misal routes/caseRoutes.js) dan struktur kode yang diharapkan (ES modules/CommonJS).
	- Menetapkan batasan (ukuran fungsi, dependencies yang boleh digunakan).

	Setelah prompt siap, AI Codex memprosesnya untuk menghasilkan kode dan menambah file ke repositori.

- Manajemen Sprint – Di awal sprint, management/sprint_plan.md diisi dengan item backlog terpilih. AI dapat membaca backlog dan membantu menyusun rencana sprint. Selama sprint, AI memutakhirkan status_board.md ketika menyelesaikan task (misal “generate triage service”), dan menambahkan catatan ke meeting_notes/ jika ada kendala.
- Code Generation & Review – AI menghasilkan file kode berdasarkan prompt. Setelah file dibuat, manusia meninjau (code review), memberi masukan, dan memperbaiki jika diperlukan. Versi final disimpan di repositori dan diacu di dokumen manajemen (kolom Done).
- Testing & Deployment – Saat modul selesai, AI dapat dipandu dengan prompt manajemen untuk membuat tes unit atau skrip deployment. Checklist di management/checklist.md harus diverifikasi sebelum meluncurkan ke staging/produksi.

## Rekomendasi Standar Isi Prompt

- Pendahuluan: satu paragraf yang menjelaskan tujuan tugas.
- Rujukan: tautan atau relative path ke dokumen desain dan file kode lain yang relevan.
- Spesifikasi Teknis: definisikan fungsi yang harus ada, input/output, error handling, dan dependensi.
- Keterbatasan: seperti gaya kode (callback vs async/await), batas baris, larangan penggunaan library tertentu, atau keharusan menulis komentar JSDoc.
- Format Output: sebutkan tipe file (mis. .js, .md) dan struktur direktori tempat file harus disimpan.

Dengan kerangka kerja ini, AI dapat berperan sebagai pengembang dan project manager yang terarah: menggunakan dokumen desain sebagai sumber kebenaran, backlog untuk memprioritaskan pekerjaan, prompt untuk menghasilkan artefak baru, dan dokumen manajemen untuk melacak progres. Pengembang manusia tetap memiliki peran dalam validasi, supervisi, dan penyesuaian strategi ketika ada perubahan kebutuhan.