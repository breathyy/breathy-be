# Algoritma Ensemble Triage (S)

Tujuan: Gabungkan skor gejala (S_s) dan skor citra (S_i) menjadi skor keparahan total S untuk menentukan kelas Mild/Moderate/Severe.

Definisi:
- S_i: skor dari analisis citra sputum/tenggorokan (0–1). Marker: sputum hijau (0.40), bercak darah (0.30), viskositas (0.20), jernih (0.10 indikator ringan/baseline). Bobot dapat disetel.
- S_s: skor dari NLU atas gejala: demam ≥ 38 °C (0.30), durasi batuk > 3 hari (0.20), sesak napas (0.35), komorbiditas (0.15).
- α (alpha): bobot visi relatif terhadap teks (default lebih besar untuk visi). Ambil dari env TRIAGE_ALPHA.

Rumus:
S = α · S_i + (1 − α) · S_s

Kelas keparahan:
- Mild: S < 0.4
- Moderate: 0.4 ≤ S ≤ 0.7
- Severe: S > 0.7

Kontrak layanan:
- Input: case_id → baca agregat S_i terbaru pada images(case_id) dan S_s pada symptoms(case_id).
- Output: { severity_score: S, severity_class: "MILD|MODERATE|SEVERE" }.
- Error: jika salah satu komponen hilang, tandai WAITING_DATA atau fallback ke yang tersedia dengan confidence rendah.

Catatan implementasi:
- Simpan severity_score dan severity_class ke tabel cases.
- Log audit pada perubahan.
