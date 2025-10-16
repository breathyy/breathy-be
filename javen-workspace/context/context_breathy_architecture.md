## Arsitektur Sistem Breathy

Deskripsi ini menguraikan arsitektur lengkap sistem Breathy. Sistem terdiri dari beberapa komponen utama yang saling terhubung untuk menyediakan layanan triage ISPA berbasis kecerdasan buatan.

### Komponen Utama

1) WhatsApp Chatbot
- Teknologi: WhatsApp + Azure Communication Services.
- Fungsi: Kanal utama pasien untuk konsultasi; menerima pesan gejala dan meneruskan ke backend untuk analisis.
- Alur: Pesan dikirim ke endpoint backend; backend merespons dengan hasil analisis dan instruksi.

2) Web Front‑end
- Teknologi: Next.js + Tailwind CSS (Azure App Service).
- Fungsi: Antarmuka pasien/dokter/RS untuk status, verifikasi diagnosis, dan pemantauan rujukan.
- Alur: Frontend memanggil backend untuk data kasus; unggah gambar ke penyimpanan melalui backend.

3) Backend Instances (Azure App Service)
- Teknologi: Node.js/Express.
- Fungsi: Inti logika bisnis; menerima data dari chatbot/frontend, menjalankan triage, memanggil AI, menyimpan/mengambil data.
- Interaksi:
	- Menerima permintaan dari WhatsApp dan aplikasi web.
	- Menyimpan data gejala, gambar, dan hasil analisis ke Data Warehouse.
	- Memanggil AI Resource Group (Copilot Studio, Cognitive Services) untuk analisis teks/gambar.
	- Mengirim rekomendasi ke pengguna/dokter.

4) Data Warehouse
- Komponen:
	- Azure Blob Storage: menyimpan file tidak terstruktur (gambar dahak, hasil pemeriksaan).
	- Azure PostgreSQL: menyimpan data terstruktur (pengguna, kasus, skor, catatan dokter).
- Catatan: Backend mengelola transaksi ke keduanya; data menjadi sumber proses AI dan dashboard.

5) AI Resource Group
- Copilot Studio: alur percakapan dan NLU untuk triage teks.
- Azure Cognitive Services: analisis teks/visi komputer untuk menilai gejala dan gambar.
- Interaksi: Melalui API; memproses data dari data warehouse dan mengembalikan hasil analisis (skor, marker) ke backend.

### Alur Data (tanpa message bus)
- Interaksi pengguna: WhatsApp/Web mengirim permintaan langsung ke backend tanpa perantara message bus.
- Pengelolaan data: Backend menyimpan gejala, skor, dan gambar ke PostgreSQL/Blob.
- Pemanggilan AI: Backend memanggil layanan AI; AI menggunakan data warehouse untuk kalibrasi; hasil dikirim kembali ke backend.
- Pengembalian hasil: Backend mengolah hasil dan merespons via chatbot/web; kasus yang butuh verifikasi dikirim ke dokter/RS.
- Penyimpanan & monitoring: Semua interaksi/hitung disimpan untuk monitoring, analisis, dan pelaporan.

Dengan pendekatan ini, komponen Breathy terhubung langsung melalui backend, sehingga komunikasi antar layanan sederhana tanpa message bus eksternal.