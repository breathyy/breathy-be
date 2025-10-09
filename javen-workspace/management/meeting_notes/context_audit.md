# Laporan Audit Keselarasan Context — 10 Okt 2025

Dokumen ini merangkum hasil audit keselarasan antara berkas di `javen-workspace/context/` (sumber kebenaran tertinggi) dan seluruh dokumen turunan (overview, design, management, prompts) pada proyek Breathy.

## Ringkasan Kepatuhan

- Arsitektur dan data flow: Mayoritas dokumen design dan overview konsisten dengan komponen inti (Express API, PostgreSQL, Blob Storage, ACS WhatsApp, NLU, Vision). Threshold triage dan formula S = α·S_i + (1−α)·S_s juga konsisten di sebagian besar dokumen.
- Terminologi: Pembedaan CaseStatus vs severity_class sudah ditegaskan di `design/architecture_overview.md` dan `design/api/api_specification.md`.
- Checklists dan prompts: Struktur checklist modul dan integrasi sudah lengkap; prompts kode mengacu ke design dan checklist terkait.

## Temuan Ketidakselarasan & Rekomendasi Perbaikan

1) Service Bus: konteks vs overview/integration
   - Lokasi:
     - `context/context_breathy_architecture.md` — menekankan alur tanpa Azure Service Bus (langsung via backend).
     - `overview_integration.md` — menempatkan Azure Service Bus (ASB) sebagai arsitektur utama, dengan catatan alternatif tanpa ASB di akhir.
     - `overview_design.md` (bagian “4. Arsitektur Sistem & Integrasi Azure”) — kembali menempatkan ASB sebagai komponen inti.
   - Dampak: Potensi kebingungan implementasi pipeline (workers, queue) dan urutan tahap integrasi (Tahap 07).
   - Rekomendasi: Tetapkan “default MVP tanpa ASB” sesuai konteks; pertahankan ASB sebagai opsi lanjutan. Perbarui `overview_integration.md` sehingga skenario default adalah no‑bus, dan pindahkan ASB ke subbab “Arsitektur alternatif (opsional)”. Sinkronkan bahasa serupa di `overview_design.md`.

2) Nama state CaseStatus tidak konsisten (WAITING_DOCTOR vs WAIT_DOCTOR_REVIEW)
   - Lokasi:
     - `design/database/schema.md` — enum: IN_CHATBOT, WAITING_DOCTOR, MILD, MODERATE, SEVERE.
     - `management/checklists/checklist_triage_bot.md` — menyebut “Transisi ke WAIT_DOCTOR_REVIEW”.
     - Beberapa paragraf di `overview_design.md` menggunakan “WAIT_DOCTOR_REVIEW”.
   - Dampak: Migrasi schema dan implementasi state machine berisiko tidak sinkron (bug integrasi dan tes gagal).
   - Rekomendasi: Standarkan ke `WAITING_DOCTOR` (sesuai schema.md dan instruksi). Cari & ganti referensi “WAIT_DOCTOR_REVIEW”.

3) Bobot “Clear/normal sputum” negatif di algoritma (−0.10) vs konteks (0.10)
   - Lokasi: `design/algorithms/ensemble_triage.md` — tertulis “jernih (−0.10 indikator ringan)”.
   - Dampak: Mengurangi skor secara tidak diinginkan; menyimpang dari contoh bobot di konteks yang menyatakan 0.10 sebagai baseline rendah (bukan negatif).
   - Rekomendasi: Ubah bobot menjadi +0.10 agar konsisten dengan dokumen konteks dan tabel contoh.

4) Kolom “start_date/end_date” kasus disebut di overview tetapi tidak ada di schema
   - Lokasi:
     - `overview_design.md` — menyebut `cases` berisi `start_date`, `end_date`.
     - `design/database/schema.md` — tidak mencantumkan kolom tersebut.
   - Dampak: Ketidakkonsistenan antara perencanaan dan implementasi DB; bisa memengaruhi pelaporan durasi kasus atau SLA follow‑up.
   - Rekomendasi: Tambahkan kolom tersebut ke schema (atau hapus dari overview jika tidak dibutuhkan). Jelasnya, tetapkan sumber kebenaran di `schema.md` dan sesuaikan dokumen lain.

5) Rujukan dokumen tidak ada (dead references) di master PM
   - Lokasi: `master_pm.md` — menyebut `overview_management.md`, `deep_report_v2.md`, `updated_design_no_bus.md` yang tidak ada di repo.
   - Dampak: Menyesatkan agen AI saat membaca rujukan.
   - Rekomendasi: Ganti rujukan menjadi dokumen yang tersedia (`overview_integration.md`, `overview_design.md`) atau tambahkan file yang dimaksud. Minimum: hapus/rapikan bagian “Sources” yang berisi log chat tak relevan.

6) Prompt Auth tidak memuat OTP pasien (hanya JWT provider)
   - Lokasi: `prompts/code/auth_module_prompt.md` — fokus pada JWT untuk DOCTOR/HOSPITAL; tidak mencakup `POST /auth/patient/otp/request|verify`.
   - Dampak: Agen AI bisa melewatkan implementasi OTP pasien meski API spec dan checklist mengharuskannya.
   - Rekomendasi: Tambahkan keluaran yang mencakup endpoint OTP pasien (routes, controller, service) atau buat prompt terpisah `patient_otp_prompt.md` dan tautkan dari prompt auth utama.

7) Referensi NLU tidak mengutip dokumen bobot S_s secara eksplisit
   - Lokasi: `prompts/code/nlu_service_prompt.md` — merujuk followup_engine.md, tetapi tidak secara eksplisit merujuk `design/algorithms/ensemble_triage.md` sebagai sumber bobot S_s.
   - Dampak: Risiko perbedaan bobot gejala vs implementasi.
   - Rekomendasi: Tambahkan rujukan ke `ensemble_triage.md` dan parameterisasi bobot dari env/konfigurasi.

8) Inklusi log percakapan/sumber yang mengganggu konsistensi
   - Lokasi: Bagian “Sources/Chat logs” di `overview_design.md`.
   - Dampak: Kebisingan dokumentasi; menurunkan kejelasan sumber kebenaran.
   - Rekomendasi: Pindahkan catatan percakapan ke `management/meeting_notes/` atau hapus dari dokumen desain.

## Perubahan Kecil yang Sudah Diterapkan (Quick Wins)

- Standarisasi istilah state di checklist triage: ganti “WAIT_DOCTOR_REVIEW” menjadi “WAITING_DOCTOR”.
- Perbaikan bobot “Clear/normal sputum” di `ensemble_triage.md` menjadi +0.10.
- Penambahan rujukan `ensemble_triage.md` pada prompt NLU untuk menyamakan bobot S_s.
- Penambahan cakupan OTP pasien pada prompt Auth.

Catatan: Perubahan di atas bersifat dokumentasi/konfigurasi dan tidak mengubah kode sumber. Penyesuaian lanjutan yang menyentuh skema DB dan overview disarankan pada sprint berikutnya.

## Rekomendasi Tindak Lanjut (Prioritas)

1) Putuskan arsitektur default (tanpa Service Bus) dan refactor `overview_integration.md` agar no‑bus menjadi jalur utama; pindahkan ASB ke opsi lanjutan. Update bagian terkait di `overview_design.md`.
2) Tetapkan konvensi final untuk CaseStatus dan nama kolom kasus (`status` vs `state`), lalu sinkronkan lintas dokumen (schema, API, checklists, prompts). Disarankan menggunakan `cases.status`.
3) Selesaikan gap schema: tambah `start_date/end_date` jika diperlukan, atau hapus dari overview bila tidak dipakai. Tambahkan juga indeks dan enum constraints sesuai rekomendasi `schema.md`.
4) Rapikan `master_pm.md` dan `overview_design.md` dengan menghapus log chat dan referensi dokumen yang tidak ada.
5) Tambahkan prompt khusus OTP pasien (bila tidak menggabungkannya ke `auth_module_prompt.md`) agar agen AI tidak melewatkan flow OTP.

## Bukti Rujukan

- Context: `context/context_breathy_architecture.md`, `context_breathy-ai-preprocessing.md`, `context_breathy-data-processing.md`, `context_breathy-wokflow.md`.
- Overview: `overview_integration.md`, `overview_design.md`.
- Design: `design/architecture_overview.md`, `design/api/api_specification.md`, `design/algorithms/ensemble_triage.md`, `design/database/schema.md`, `design/security/guidelines.md`.
- Management: `management/checklists/*.md`, `management/integration_checklists/*`, `management/meeting_notes/audit_notes.md`.
- Prompts: `prompts/code/*.md`.

— Disusun oleh auditor internal, 10 Okt 2025.
