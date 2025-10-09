# Mesin Follow-Up 7 Hari

Tujuan: Setelah dokter menyetujui kasus MILD/MODERATE, sistem membuat tugas harian selama 7 hari, mengirim pengingat, dan mencatat progres.

Prinsip:
- Idempoten: pemanggilan berulang tidak menduplikasi tugas (gunakan upsert by case_id + day_index).
- Penjadwalan: due_at default pagi waktu lokal; dapat dikonfigurasi.
- Edge cases: pasien tidak merespons, perubahan status ke SEVERE, rujukan terjadi di tengah periode.

Kontrak:
- generateTasks(caseId): membuat 7 tugas standar sesuai kelas keparahan.
- markTaskDone(taskId): menandai selesai dengan timestamp.
- reschedule(caseId): menyesuaikan sisa tugas bila ada perubahan status.

Skema terkait: tabel daily_tasks (case_id, day_index, task_type, instruction, done, due_at, completed_at, notes).
