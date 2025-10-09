## Diagram Proses Input Breathy

Alur pemrosesan data masuk sebelum dipakai oleh chatbot dan modul inferensi.

### Jenis Input
Sistem menerima tiga jenis data dari pengguna:

1) Respon teks bebas (Free‑Text Responses)
- Teks tanpa struktur khusus (mis. deskripsi gejala), diekstraksi dan dikirim ke transformasi teks.

2) Respon terstruktur (Structured Responses)
- Pilihan gejala dari daftar atau isian terkontrol (contoh: durasi batuk, ada/tiada demam); ikut ke transformasi teks.

3) Unggahan gambar (Image Uploads)
- Berkas gambar (dahak/kondisi fisik lain), diperlakukan sebagai data mentah dan dikirim ke transformasi gambar.

### Tahap Transformasi
Setelah ekstraksi, data melewati dua jalur transformasi:

- Transformasi Teks: menggunakan Microsoft Copilot Studio untuk analisis teks, ekstraksi entitas, dan normalisasi ke format terstruktur.
- Transformasi Gambar: menggunakan Azure Cognitive Services untuk QC, deteksi ciri klinis, dan pembuatan metrik (warna, viskositas, bercak darah).

### Penyimpanan pada Data Warehouse
- Azure PostgreSQL: menyimpan data terstruktur hasil transformasi teks (variabel gejala, skor sementara, metadata).
- Azure Blob Storage: menyimpan berkas gambar pascaproses serta keluaran intermediate modul visi.

### Integrasi dengan Breathy
Setelah tersimpan, modul Breathy mengambil data dari gudang untuk:

- Analisis lanjutan: menggabungkan hasil teks dan gambar untuk menghitung skor keparahan dan kategori kasus.
- Interaksi dengan pengguna: chatbot menyampaikan hasil atau meneruskan ke dokter bila perlu.
- Pembelajaran model: data historis dipakai untuk melatih/validasi model AI.

Alur ini memastikan input teks, isian terstruktur, dan gambar diproses konsisten, disimpan aman, dan dimanfaatkan untuk triage yang akurat.