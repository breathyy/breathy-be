# Checklist Modul: Follow-Up Engine (7 Hari)

Rujukan: [design/algorithms/followup_engine.md](../../design/algorithms/followup_engine.md), [design/api/api_specification.md](../../design/api/api_specification.md)

## Tugas

- [ ] Definisikan model `daily_tasks` dengan kolom: case_id, day_index, task_type, instruction, done, due_at, completed_at, notes.
- [ ] Implementasi upsert idempoten: generate 7 hari tugas untuk MILD/MODERATE setelah persetujuan dokter.
- [ ] Logika penyesuaian jika case berakhir/rujukan terjadi di tengah periode.
- [ ] Endpoint GET/POST `/cases/:id/tasks` untuk list dan update status harian.
 - [ ] Endpoint POST `/cases/:id/tasks/:taskId/complete` untuk menandai selesai.
- [ ] Notifikasi WA harian via ACS (jadwal lokal; kirim pagi hari default, dapat dikonfigurasi).
- [ ] Penanganan edge cases: missed days, pasien berhenti, eskalasi menjadi SEVERE.

## Verifikasi

- [ ] Penggunaan ulang generate tidak menduplikasi tugas (idempoten teruji).
- [ ] Checklist tampil di dashboard dokter.
- [ ] Perubahan status harian tercermin di DB dan notifikasi.

## Catatan

- ...

## Target

- Target selesai: ...
