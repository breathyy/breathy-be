# 08 - Triage Engine & State Machine Wiring

Rujukan: [design/architecture_overview.md](../../design/architecture_overview.md), [design/api/api_specification.md](../../design/api/api_specification.md)

## Tugas

- [x] Implement `triageService`: S = α*S_i + (1-α)*S_s dengan thresholds Mild/Moderate/Severe.
- [x] Update `cases`: severity_score, severity_class, sputum_category, start_date, end_date.
- [ ] Transisi state: IN_CHATBOT → WAITING_DOCTOR → (MILD|MODERATE|SEVERE) pasca persetujuan dokter.
- [x] Trigger follow-up engine untuk MILD/MODERATE.
 - [ ] Rujuk ke dokumen [design/algorithms/ensemble_triage.md](../../design/algorithms/ensemble_triage.md) untuk parameter; tulis unit test hitung skor & transisi.
 - [ ] Panggil `nluService` dan `visionService` langsung dari backend tanpa antrian.
 - [ ] Terapkan aturan coding: tanpa komentar, camelCase, modul ringkas.

## Verifikasi

- [ ] Unit test perhitungan skor dan transisi.

## Catatan

- ...
