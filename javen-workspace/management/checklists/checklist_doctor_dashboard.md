# Checklist Modul: Dashboard Dokter & Rumah Sakit

Rujukan: [design/api/api_specification.md](../../design/api/api_specification.md), [design/architecture_overview.md](../../design/architecture_overview.md)

## Tugas

- [ ] Login dokter/rumah sakit (JWT), role-based access.
- [ ] API listing kasus: filter status, kelas keparahan, tanggal.
- [ ] API persetujuan dokter: POST /cases/:id/approve (payload: severity_adjustment, notes).
- [ ] API checklist harian: GET/POST /cases/:id/tasks.
- [ ] API histori chat dan tindakan.
- [ ] Notifikasi real-time (opsional tahap berikutnya) atau polling aman.

## Verifikasi

- [ ] Akses dibatasi sesuai peran.
- [ ] Alur persetujuan memicu follow-up engine untuk MILD/MODERATE.

## Catatan

- ...

## Target

- Target selesai: ...
