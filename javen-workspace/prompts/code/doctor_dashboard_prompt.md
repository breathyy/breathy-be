# Prompt: Generate Doctor & Hospital Dashboard APIs

Rujukan: [../../design/api/api_specification.md](../../design/api/api_specification.md), [../../management/checklists/checklist_doctor_dashboard.md](../../management/checklists/checklist_doctor_dashboard.md)

Tujuan: Buat API untuk login, listing kasus, persetujuan dokter, checklist harian, dan histori.

Keluaran yang diharapkan:
- routes/doctorRoutes.js, routes/hospitalRoutes.js.
- controllers/doctorController.js dengan approveCase, listCases.
- controllers/taskController.js dengan listTasks, updateTask.

Batasan:
- Terapkan RBAC ketat.
