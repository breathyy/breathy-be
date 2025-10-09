## Alur Interaksi Breathy

Deskripsi tekstual alur interaksi dalam sistem Breathy yang melibatkan pengguna, Breathy (AI), dokter, dan rumah sakit.

### 1) Pengguna (Users)
Seorang pasien yang merasa menderita ISPA memulai konsultasi dengan AI Breathy. Setelah triage, Breathy mengklasifikasikan kondisi pasien:

- Kasus ringan (Mild): pasien menerima diagnosis awal dan rencana self‑care di rumah (mis. minum cukup, istirahat sesuai kondisi).
- Kasus sedang (Moderate): pasien menerima diagnosis; Breathy memonitor penggunaan obat dan dapat mengarahkan konsultasi dokter melalui rujukan.
- Kasus berat (Severe): pasien menerima diagnosis dan pantauan ketat; Breathy merujuk langsung ke darurat (ambulans/IGD) dan menyarankan konsultasi segera.

### 2) Breathy (AI)
Fungsi utama sebagai penyedia layanan triage:

- Menerima laporan dan melakukan screening: memproses input gejala dengan AI/NLU/analisis gambar.
- Mendapatkan tanggapan dokter dan finalisasi diagnosis: mengirim ringkasan hasil analisis ke dokter untuk verifikasi, keputusan akhir, dan rekomendasi tindak lanjut.
- Monitoring perkembangan: memantau kondisi hingga sembuh, termasuk kepatuhan self‑care atau pemakaian obat.
- Respon cepat: untuk kasus berat, menyiapkan rujukan cepat ke ambulans/IGD.

### 3) Dokter
Peran dokter dalam sistem:

- Verifikasi dan penanganan pasien: memeriksa serta memvalidasi diagnosis AI, lalu menangani pasien rujukan.
- Menerima ringkasan analisis: meninjau gejala dan kategorisasi dahak; memberikan keputusan akhir dan resep.
- Penanganan di fasilitas: dokter di fasilitas kesehatan menangani pasien Moderate/Severe yang dirujuk.

### 4) Rumah Sakit
Peran institusi medis sebagai dukungan lanjutan:

- Dokter verifikator: memverifikasi dan menindaklanjuti pasien yang masuk melalui sistem Breathy.
- Rujukan pasien Moderate: menerima pasien kategori sedang untuk pemeriksaan lanjutan/praktek dokter umum.
- IGD darurat: untuk Severe, IGD menerima informasi darurat dan segera menangani pasien.
- Manfaat operasional: kenaikan pasien rujukan berdampak pada layanan/penjualan obat mitra (termasuk apotek).

### 5) Alur Rujukan dan Komunikasi
Ringkasan alur komunikasi antar entitas:

| Tahapan | Alur komunikasi |
|---|---|
| Inisiasi | Pasien mengirim laporan gejala ke Breathy melalui chat. |
| Screening oleh Breathy | Breathy memproses laporan, menghitung skor keparahan, lalu mengirim hasil analisis ke dokter verifikator. |
| Verifikasi dokter | Dokter mengevaluasi ringkasan AI, menetapkan diagnosis akhir dan resep, serta mengembalikan keputusan ke Breathy. |
| Tindak lanjut | Breathy menyampaikan diagnosis dan rencana tindakan ke pasien. Mild: self‑care; Moderate: diarahkan ke dokter; Severe: dirujuk ke IGD. |
| Monitoring | Breathy memantau pemulihan dan memberi pengingat sesuai rencana perawatan. |

Alur ini memungkinkan pasien mendapat bantuan cepat dan akurat sesuai tingkat keparahan, melalui kolaborasi antara AI Breathy, dokter, dan rumah sakit.