## Breathy Artificial Intelligence Screening Workflow

Bagian ini menjelaskan bagaimana Breathy menggabungkan analisis gambar dan gejala untuk menilai tingkat keparahan ISPA: inferensi gambar, inferensi gejala, lalu penggabungan hasil (ensemble triage).

### 3.3.1 Image Inference
Breathy melakukan inferensi gambar melalui kontrol kualitas otomatis diikuti ekstraksi fitur klinis.

- Kontrol kualitas: gambar (tenggorokan/dahak) diperiksa oleh Azure Cognitive Services untuk kejernihan, pencahayaan, dan validitas area; gambar buram/gelap diminta ulang.
- Deteksi markah klinis: setelah QC, model visi mendeteksi markah; tiap markah berkontribusi pada Image Severity Score (S_i) yang dinormalisasi 0–1.

Contoh markah dan bobot:

| Markah | Deskripsi | Bobot | Interpretasi |
|---|---|---:|---|
| Greenish/yellow color | Infeksi purulen (kemungkinan bakteri) | 0.40 | Indikator kuat |
| Bloody streaks | Infeksi berat/komplikasi | 0.30 | Sedang–kuat |
| Thick/viscous sputum | Peradangan jalan napas berlangsung | 0.20 | Ringan–sedang |
| Clear/normal sputum | Kekhawatiran klinis rendah | 0.10 | Baseline |

Semakin besar bobot, semakin kuat peningkatan skor keparahan gambar.

### 3.3.2 Symptom Inference
Teks diproses via Microsoft Copilot Studio (NLU) untuk mengekstrak entitas menjadi variabel terstruktur; setiap entitas menyumbang bobot ke Symptom Severity Score (S_s).

| Gejala | Variabel Terstruktur | Bobot | Kontribusi |
|---|---|---:|---|
| Demam ≥ 38 °C | fever_status = high | 0.30 | Indikator kuat |
| Batuk > 3 hari | onset_days > 3 | 0.20 | Indikator sedang |
| Sesak napas | dyspnea = true | 0.35 | Indikator kuat |
| Komorbiditas | comorbidity = 1 | 0.15 | Ringan–sedang |

Nilai S_s dihitung dari penjumlahan bobot gejala terdeteksi dan dinormalisasi 0–1.

### 3.3.3 Ensemble Triage
- Penggabungan skor: S dihitung dengan memberi bobot lebih besar pada citra namun tetap memasukkan gejala. Formula: S = α × S_i + (1 − α) × S_s, 0 ≤ α ≤ 1.
- Klasifikasi:

| Kategori | Batas nilai S |
|---|---|
| Mild | S < 0.4 |
| Moderate | 0.4 ≤ S ≤ 0.7 |
| Severe | S ≥ 0.7 |

Catatan: skor adalah dukungan triage AI; keputusan klinis final oleh dokter verifikator.