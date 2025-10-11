# Prompt: Generate Triage Service

Rujukan: [../../design/architecture_overview.md](../../design/architecture_overview.md), [../../design/api/api_specification.md](../../design/api/api_specification.md), [../../management/checklists/checklist_triage_bot.md](../../management/checklists/checklist_triage_bot.md)

Tujuan: Implementasi `triageService` yang menghitung S_s dan S_i dari DB, lalu S = α*S_i + (1-α)*S_s, menentukan severity_class (Mild/Moderate/Severe) dan mengelola transisi state kasus. Panggil `nluService` dan `visionService` langsung tanpa antrian.

Keluaran yang diharapkan:
- services/triageService.js dengan fungsi: calculateSeverity(caseId), applyDoctorApproval(caseId, payload), transitionCaseState(caseId, nextState, reason).
- tests/triageService.test.js untuk happy path + edge cases.

Batasan:
- Threshold Mild < 0.4, Moderate 0.4–0.7, Severe > 0.7; α dari env.
- Tanpa komentar, camelCase, modul ringkas. Audit log setiap perubahan state.
