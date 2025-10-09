# Prompt: Generate Follow-Up Engine (7 days)

Rujukan: [../../design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [../../management/checklists/checklist_followup_engine.md](../../management/checklists/checklist_followup_engine.md)

Tujuan: Buat engine yang meng-upsert 7 tugas harian untuk kasus MILD/MODERATE, menandai selesai, dan mengirim notifikasi WA.

Keluaran yang diharapkan:
- services/followupService.js: generateTasks(caseId), markTaskDone(taskId), reschedule(caseId).
- routes/taskRoutes.js: GET/POST /cases/:id/tasks.
- tests untuk idempotensi upsert.

Batasan:
- Tahan terhadap duplikasi dan perubahan status kasus.
