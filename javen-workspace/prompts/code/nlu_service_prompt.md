# Prompt: Generate NLU Service

Rujukan: [../../design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [../../design/algorithms/ensemble_triage.md](../../design/algorithms/ensemble_triage.md), [../../management/checklists/checklist_nlu.md](../../management/checklists/checklist_nlu.md)

Tujuan: Buat `nluService` untuk memanggil Copilot Studio/LUIS, memetakan entitas (fever_status, onset_days, dyspnea, comorbidity) dan menghitung S_s.

Keluaran yang diharapkan:
- services/nluService.js dengan fungsi analyzeText(text, opts) → { entities, S_s }.
- tests/nluService.test.js: parsing dan error handling.

Batasan:
- Implement retry dan timeout; logging ke App Insights.
