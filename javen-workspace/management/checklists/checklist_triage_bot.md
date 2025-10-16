# Checklist Modul: Triage Bot & State Machine

Rujukan: [design/architecture_overview.md](../../design/architecture_overview.md), [design/api/api_specification.md](../../design/api/api_specification.md), [design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [overview_integration.md](../../overview_integration.md)

Catatan: Gunakan state lifecycle kasus: IN_CHATBOT → WAITING_DOCTOR → MILD/MODERATE/SEVERE dengan persetujuan dokter dan rujukan.

## Tugas

- [x] Definisikan enumerasi CaseStatus dan SputumCategory di skema DB; pastikan sinkron dengan dokumen desain.
- [ ] Implementasikan state INIT: salam awal dan penjelasan consent.
- [x] Implementasikan SEND_OTP: generasi OTP, simpan hash + expiry pada tabel otp_codes, kirim via ACS/WhatsApp.
- [x] Implementasikan VERIFY_OTP: validasi OTP dengan retry terbatas dan lockout ringan.
- [x] Implementasikan COLLECT_SYMPTOMS: pertanyaan adaptif (demam, batuk, sesak napas, durasi, komorbiditas).
- [x] Implementasikan REQUEST_IMAGES: terima foto sputum/tenggorokan, lakukan QC dasar (blur/kecerahan/aspect ratio).
- [x] Implementasikan CALCULATE_SEVERITY: panggil NLU (S_s) dan Vision (S_i), hitung S gabungan dengan α dari env.
- [x] Transisi ke WAITING_DOCTOR: buat event ke dashboard dokter dan simpan summary kasus.
- [x] Dokter menyetujui/adjust: update severity_score, severity_class; trigger follow-up engine untuk MILD/MODERATE.
- [ ] SEVERE: buat entri rujukan dan notifikasi rumah sakit.
- [ ] Audit log tiap transisi state (created_by, created_at, reason).
- [x] Endpoint OTP: POST /auth/patient/otp/request dan /auth/patient/otp/verify.

## Verifikasi

- [ ] Tes unit untuk tiap transisi state (happy path, OTP salah, foto gagal QC, NLU/Vision timeout).
- [x] Endpoint terkait di API berfungsi: /chat/incoming, /cases/:id/approve.
- [ ] Data konsisten di tabel cases, daily_tasks, referrals.
- [ ] Verifikasi endpoint task completion: POST /cases/:id/tasks/:taskId/complete.

## Catatan

- ...

## Target

- Target selesai: ...
