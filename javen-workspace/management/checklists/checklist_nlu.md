# Checklist Modul: NLU (Copilot Studio/LUIS)

Rujukan: [design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [overview_integration.md](../../overview_integration.md)

## Tugas

- [ ] Siapkan project Copilot Studio/LUIS: intent ISPA intake; entitas fever_status, onset_days, dyspnea, comorbidity, other_symptoms.
- [ ] Buat environment variable COPILOT_ENDPOINT dan COPILOT_KEY.
- [ ] Implementasi nluService: panggil API, normalisasi entitas ke skema symptoms, hitung S_s.
- [ ] Tangani error dan retry (exponential backoff, circuit breaker minimal).
- [ ] Simpan hasil ke DB: symptoms table terhubung ke case_id.
- [ ] Logging observabilitas (latency, error codes) ke App Insights.

## Verifikasi

- [ ] Input teks contoh mengembalikan entitas yang benar.
- [ ] Nilai S_s konsisten dengan bobot desain.
- [ ] Unit test untuk parsing dan normalisasi.

## Catatan

- ...

## Target

- Target selesai: ...
