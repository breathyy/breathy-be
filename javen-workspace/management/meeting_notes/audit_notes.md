# Catatan Audit — 10 Okt 2025

Rangkuman:
- Menyelaraskan API OTP pasien, endpoint tasks completion, dan istilah CaseStatus vs severity_class di seluruh dokumen.
- Menambahkan enum constraint pada migrasi database.
- Mempertegas referensi ke dokumen ensemble triage untuk wiring triage engine.

Ketidaksesuaian yang dikoreksi:
- API spec belum memuat OTP dan task completion → diperbarui.
- Checklist DB belum menyebut enum CaseStatus/SputumCategory → ditambahkan.
- Arsitektur belum menegaskan pembedaan CaseStatus vs severity_class → diperjelas.

Tindak lanjut:
- Saat implementasi, pastikan unit test untuk transisi state & perhitungan skor.
- Review kembali kebutuhan no-bus vs Service Bus pada tahap 07 sesuai keputusan arsitektur final.
