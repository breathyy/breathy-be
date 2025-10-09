# Overall Progress — Breathy Backend

Dokumen ini merangkum progres seluruh modul dan tahapan integrasi.

## Ringkasan Persentase (Isi manual/otomatis oleh skrip)

- Modul: Triage Bot, NLU, Image Inference, Geolocation, Doctor Dashboard, Follow-Up Engine, Security.
- Integrasi: Tahap 01 s.d. 13.

Format: `Nama Item — X% (To Do/In Progress/Done)`

## Milestone Tercapai

- Dokumen desain inti terisi: arsitektur, algoritma (ensemble triage, follow-up), API ringkas, skema DB, keamanan.
- Checklist modul dan integrasi dibuat dan diselaraskan dengan desain.
- Spesifikasi API diperbarui untuk OTP pasien dan task completion.

## Hambatan & Mitigasi

- Hambatan: Keputusan final arsitektur dengan/atau tanpa Service Bus (mempengaruhi tahap 07).
- Mitigasi: Sediakan cabang tugas untuk kedua opsi; konfirmasi pilihan sebelum implementasi worker.

## Rekomendasi Sprint Berikutnya

- Implement tahap 03 (skeleton backend) dan 02 (skema DB) bersamaan untuk validasi koneksi.
- Implement auth (OTP pasien dan JWT tenaga kesehatan) sesuai API baru.
- Siapkan storage wrapper dan upload alur (tahap 04), lalu webhook ACS (tahap 05).

## Referensi

- [overview_integration.md](../overview_integration.md)
- [management/checklists/](./checklists)
- [management/integration_checklists/](./integration_checklists)
