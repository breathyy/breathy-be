## Rencana Penelitian dan Desain Backend Breathy (Versi Mendalam)

### Pembaruan 10 Oktober 2025 — Sinkronisasi UI dan Backend

Untuk menyelaraskan backend Node.js/Express dengan UI terbaru (login, personalisasi pasien, dashboard dokter/rumah sakit), spesifikasi dan skema telah direvisi dan didokumentasikan dalam berkas berikut:

- `design/api/api_specification.md` — Spesifikasi endpoint terbaru: OTP pasien, login dokter/rumah sakit, lifecycle kasus (IN_CHATBOT → WAITING_DOCTOR → MILD/MODERATE/SEVERE), persetujuan dokter, checklist harian (GET/POST tasks), dashboard dokter dan rumah sakit, serta histori kasus dan chat.
- `design/database/schema.md` — Skema database: tabel `users`, `doctor_users`, `hospital_users`, `hospitals`, `cases` (dengan `status`, `severity_score`, `severity_class`, `sputum_category`, `start_date`, `end_date`), `daily_tasks`, `referrals`, `chat_messages`, `otp_codes`, termasuk enumerasi `CaseStatus` dan `SputumCategory`.
- `design/architecture_overview.md` — Ikhtisar arsitektur terbaru: state machine kasus, RBAC, alur rujukan ketika SEVERE, dan integrasi layanan.
- `design/algorithms/followup_engine.md` — Detil mesin tugas harian 7 hari untuk kasus MILD/MODERATE pasca persetujuan dokter, termasuk idempoten upsert dan edge cases.

Dokumen-dokumen di atas menjadi sumber acuan untuk implementasi backend agar konsisten dengan alur dan tampilan frontend.

### 1. Ringkasan Latar Belakang

Breathy adalah pendamping kesehatan digital yang berfokus pada deteksi dan pengelolaan Infeksi Saluran Pernapasan Akut (ISPA) di Indonesia. Dibangun sebagai digital health companion di WhatsApp dan web, Breathy memanfaatkan AI multimodal (pemrosesan gambar sputum/tenggorokan dan Natural Language Understanding (NLU) untuk gejala) ditambah keterlibatan dokter sebagai manusia‑dalam‑lingkaran. Sistem ini dirancang untuk mengurai data teks, foto, dan metadata pasien melalui pipeline yang terstruktur, menghasilkan skor keparahan, dan kemudian mengarahkan pasien ke jalur perawatan yang sesuai (self‑care, apotek, atau rujukan rumah sakit).

### 2. Fitur Utama dan Inovasi

Breathy mengintegrasikan beberapa komponen:

- Chatbot Percakapan Adaptif – bot di WhatsApp dan web yang mengajukan pertanyaan kontekstual. Alur percakapan menyesuaikan berdasarkan jawaban; misalnya, keluhan “sesak napas” memicu pertanyaan lanjutan tentang frekuensi dan durasi. Bot mengumpulkan teks, metadata, dan gambar.
- Analisis Gambar – foto tenggorokan atau sputum melewati pipeline pengolahan citra (quality control untuk blur/kecerahan dan cropping) sebelum model visi mendeteksi markah klinis seperti sputum hijau (bobot 0,40), bercak darah (0,30), kekentalan (0,20) dan sputum jernih (0,10). Hasil berupa Image Severity Score S_i pada rentang 0–1.
- NLU untuk Gejala – input teks diproses oleh Microsoft Copilot Studio; variabel yang diekstraksi termasuk demam ≥ 38 °C (bobot 0,30), durasi batuk > 3 hari (0,20), sesak napas (0,35) dan komorbiditas (0,15). Outputnya Symptom Severity Score S_s.
- Ensemble Triage – gabungan hasil visi dan NLU dengan bobot yang lebih besar pada citra. Tiga kelas keparahan didefinisikan: Mild (S<0.4), Moderate (0.4≤S≤0.7) dan Severe (S>0.7). Dokter selalu memverifikasi keputusan.
- Dasbor Dokter & Rumah Sakit – antarmuka web (Next.js) yang menampilkan ringkasan kasus, heatmap gambar, prediksi AI, dan kontrol untuk menyetujui/menyesuaikan diagnosis. Rumah sakit mendapatkan notifikasi rujukan serta dasbor untuk memantau pasien darurat.
- Orkestrasi Rujukan Berbasis Geolokasi – sistem mencari apotek/rumah sakit terdekat dalam jaringan mitra dan menghasilkan catatan rujukan berisi ringkasan klinis.
- Mesin Tindak Lanjut – bot mengirimkan check‑in harian: kasus ringan mendapat pengingat perawatan mandiri, sedang memicu pemeriksaan eskalasi, dan berat mendapat pemantauan intensif.
- Agile & Data Ethics – pengembangan menggunakan sprint dengan backlog fitur, melibatkan dokter untuk validasi tiap iterasi. Data dikumpulkan melalui consent pilot; PII/PHI disaring dan dienkripsi di Azure Blob Storage dengan RBAC.

### 3. Rinci Alur Algoritma dan Desain

#### 3.1 Mesin Status Percakapan (State Machine)

Untuk mendukung percakapan yang adaptif, backend harus mengelola state machine. Setiap kasus memiliki conversation_state, dan transisi bergantung pada input. Berikut deskripsi state dan transisinya:

| State               | Tujuan & Aksi                                                                                                                                      | Transisi                                                                                                                                                                            |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| INIT                | Menyapa pengguna, menjelaskan tujuan Breathy, meminta nomor WA untuk OTP                                                                            | Input nomor → SEND_OTP                                                                                                                                                               |
| SEND_OTP            | Mengirim OTP via WhatsApp, menyimpan hash OTP dan expiry                                                                                           | OTP terkirim → VERIFY_OTP                                                                                                                                                            |
| VERIFY_OTP          | Memeriksa OTP; jika valid, minta consent melalui script (fase 0)                                                                                   | OTP benar → COLLECT_SYMPTOMS; OTP salah → VERIFY_OTP (ulang)                                                                                                                        |
| COLLECT_SYMPTOMS    | Mengumpulkan gejala: demam, batuk, sesak napas, lama sakit, komorbiditas. Bot menyesuaikan pertanyaan (mis. jika “sesak napas” → minta intensitas) | Jika ada foto diminta → REQUEST_IMAGES; jika gejala cukup → CALCULATE_SEVERITY                                                                                                      |
| REQUEST_IMAGES      | Meminta foto sputum atau tenggorokan. Bot memeriksa kualitas (blur/kecerahan/aspect ratio). Jika gagal → minta ulang                               | Foto valid → CALCULATE_SEVERITY                                                                                                                                                      |
| CALCULATE_SEVERITY  | Menjalankan pipeline NLU dan CV. Hitung S_s dan S_i; gabungkan menjadi S. Tentukan triage Mild/Moderate/Severe                                     | WAITING_DOCTOR                                                                                                                                                                       |
| WAITING_DOCTOR      | Mengirim notifikasi ke dokter; menunggu verifikasi. User mendapat pesan “Sedang ditinjau dokter”                                                   | Dokter meninjau → DOCTOR_REVIEW; Timeout/eskalasi manual                                                                                                                            |
| DOCTOR_REVIEW       | Dokter menerima ringkasan dan heatmap; dapat menyetujui, menyesuaikan severity, atau menambah catatan.                                             | Dokter setuju & mild → SELF_CARE; setuju & moderate → MONITORING; setuju & severe → REFERRAL; revisi → hitung ulang & WAITING_DOCTOR                                               |
| SELF_CARE           | Bot mengirim rekomendasi at‑home self‑care (mis. istirahat, hidrasi, monitor gejala). Sistem membuat jadwal follow‑up harian selama 3–5 hari.       | Setelah 5 hari & pulih → COMPLETE                                                                                                                                                    |
| MONITORING          | Bot mengirim panduan obat (OTC), memonitor gejala harian. Jika ada perburukan (S meningkat), kirim notifikasi ke dokter & upgrade ke REFERRAL.     | Pulih → COMPLETE; memburuk → REFERRAL                                                                                                                                                 |
| REFERRAL            | Mempersiapkan rujukan: algoritma geolokasi memilih fasilitas terdekat; generate dokumen rujukan dengan ringkasan klinis. User menerima petunjuk    | Pasien diterima → COMPLETE                                                                                                                                                           |
| COMPLETE            | Menandai kasus selesai; data disimpan untuk training/analitik.                                                                                      |                                                                                                                                                                                     |

Transisi state dilakukan via update kolom cases.status di basis data. Integrasi message bus (Azure Service Bus) bersifat opsional untuk skala; MVP dapat berjalan tanpa bus dengan pemanggilan sinkron/asinkron terkoordinasi di backend.

#### 3.2 NLU & Inference Gejala

- Ekstraksi entitas: Gunakan Microsoft Copilot Studio atau Azure LUIS. Definisikan intent (konsultasi, upload foto) dan entitas (fever_status, onset_days, dyspnea, comorbidity, other_symptoms).
- Normalisasi: Algoritma menormalisasi frasa (“tiga hari” → 3, “napas berat” → dyspnea = true). Gunakan confidence threshold (mis. ≥ 0,6) untuk menerima entitas; di bawah threshold perlu klarifikasi manual.
- Perhitungan skor: S_s = 0.30 * fever + 0.20 * cough_duration + 0.35 * dyspnea + 0.15 * comorbidity. Setiap variabel bernilai 1 jika muncul; 0 jika tidak. Pertimbangkan penyesuaian bobot dari parameter konfigurasi (.env) agar dapat di-tune tanpa ubah kode.

#### 3.3 Inference Gambar (Computer Vision)

- Quality control: Gunakan Azure Cognitive Services Vision API. Periksa blur_score, brightness, dan aspect_ratio. Jika metrik di luar batas (mis. blur_score > 0.6 atau brightness < 0.3), minta foto ulang.
- Deteksi markah: Model CNN terlatih mendeteksi markah: warna sputum (hijau/kuning), bercak darah, viskositas, area merah. Hasilnya adalah key‑value marker: confidence. Tiap marker memiliki bobot wᵢ sebagaimana tabel. Perhitungan: S_i = Σ(confidence_i * w_i) / Σ(w_i) menghasilkan nilai 0–1. Simpan metadata markers, heatmap_url (disimpan di Blob Storage) dalam tabel images.

#### 3.4 Ensemble Triage & Threshold

- Total severity: S = α * S_i + (1-α) * S_s dengan α > 0,5 (misal 0,6) untuk menekankan analisis gambar. Nilai α disimpan dalam konfigurasi. Bandingkan S dengan threshold: Mild < 0.4, Moderate 0.4–0.7, Severe > 0.7.

#### 3.5 Algoritma Geolokasi & Rujukan

- Ambil lokasi pasien dari metadata WhatsApp (jika tersedia) atau tanyakan alamat/kelurahan.
- Query basis data fasilitas mitra: tabel facilities berisi facility_id, type (pharmacy/hospital), lat, lon, services, capacity. Hitung jarak menggunakan Haversine formula dan filter berdasarkan layanan (apotek untuk moderate, IGD untuk severe).
- Periksa ketersediaan: Fasilitas dengan capacity_current / capacity_max < threshold diprioritaskan. Jika puskesmas kosong, fallback ke rumah sakit.
- Bangun dokumen rujukan: sertakan data pasien, severity_score, ringkasan NLU & CV, dan catatan dokter. Simpan rujukan di tabel referrals dan kirim notifikasi via WA dan e‑mail ke fasilitas.

#### 3.6 Mesin Tindak Lanjut

- Setiap kasus memiliki follow_up_plan yang berisi frekuensi (harian, dua kali sehari untuk moderate/severe), durasi, dan skrip pesan (dapat dikonfigurasi).
- Bot memeriksa cases.status dan follow_up.next_send_time; jika waktu terpenuhi, kirim pesan otomatis dan ubah next_send_time.
- Pengukuran gejala terkini dihitung ulang. Jika S meningkat melewati threshold eskalasi (misal moderate > 0.6 atau severe > 0.8), sistem memicu notifikasi dokter.

#### 3.7 Dasbor Dokter & Logging Keputusan

Dasbor menampilkan daftar kasus dengan filter (mild/moderate/severe), detail pasien, heatmap, grafik evolusi gejala, serta input untuk decision (approve, adjust severity, add medication, refer). Setiap tindakan dokter dicatat dalam tabel doctor_actions dengan timestamp untuk audit.

#### 3.8 Keamanan & Etika

- Consent: Script di state VERIFY_OTP harus menjelaskan penggunaan data dan meminta persetujuan eksplisit. Simpan catatan consent di tabel consent_logs.
- Anonymisasi & Enkripsi: Hapus PII/PHI sebelum data digunakan untuk training; gambar disimpan di Blob Storage terenkripsi, metadata sas_token diatur ketat.
- RBAC: Dokter hanya bisa mengakses kasus yang ditugaskan; rumah sakit hanya melihat rujukan.
- Audit Logging: Semua operasi CRUD, akses data, dan interaksi dokter harus dicatat untuk kepatuhan.

### 4. Arsitektur Sistem & Integrasi Azure

#### 4.1 Platform Azure (default tanpa Service Bus)

Breathy menggunakan layanan Azure melalui pemanggilan langsung dari backend tanpa message broker sebagai default:

- Azure Communication Services (ACS) – inbound WhatsApp ke webhook backend; outbound OTP/status.
- Azure Blob Storage – simpan gambar dan heatmap; metadata di tabel images dengan blob_url dan quality_metrics.
- Azure PostgreSQL – basis data relasional untuk kasus, pengguna, dokter, fasilitas, rujukan, log.
- Azure Cognitive Services (Vision) & Azure AI Text Analytics/Copilot Studio – API inference untuk gambar dan NLU.
- Azure Monitor & Application Insights – telemetry dan logging.

#### 4.2 Pipeline Data (default langsung)

- Teks: Pesan diterima → normalisasi NLU → simpan ke DB (symptoms) → update perhitungan S_s.
- Gambar: Media WA diunduh → upload ke Blob → QC → Vision → simpan markers & S_i ke DB (images).
- Triage: Setelah S_s atau S_i tersedia, evaluasi kesiapan; ketika keduanya ada, hitung S dan perbarui cases.severity_* serta cases.status.

#### 4.3 Alternatif opsional: Dengan Azure Service Bus

Untuk skala, antrian dapat ditambahkan antara ingestion, AI, dan notifikasi menggunakan Azure Service Bus. Jalur ini memecah proses menjadi workers yang berkomunikasi melalui queue (ingest-queue, ai-queue, notification-queue). Lihat juga tahap 7 di `overview_integration.md`.

### 5. Rencana Implementasi Express.js

#### 5.1 Struktur Direktori

```
project-root/
├── app.js          # entry point Express
├── config/
│   ├── index.js    # load env vars, create DB & Service Bus clients
│   ├── db.js       # initialize Sequelize/Prisma with PostgreSQL
│   └── azure.js    # wrappers for ACS, Cognitive Services
├── controllers/
│   ├── authController.js      # OTP & login
│   ├── chatController.js      # webhook untuk WA & web chat
│   ├── caseController.js      # CRUD kasus & triage results
│   ├── doctorController.js    # dashboard actions
│   ├── facilityController.js  # data fasilitas & rujukan
│   └── followUpController.js  # jadwal tindak lanjut
├── services/
│   ├── otpService.js          # generate & verify OTP
│   ├── nluService.js          # panggil Copilot/LUIS
│   ├── visionService.js       # panggil Cognitive Services
│   ├── triageService.js       # hitung skor & state machine
│   ├── referralService.js     # algoritma geolokasi
│   ├── followUpService.js     # scheduler follow-up
│   └── messagingService.js    # wrapper Azure Service Bus (opsional)
├── models/
│   ├── user.js
│   ├── case.js
│   ├── symptom.js
│   ├── image.js
│   ├── doctor.js
│   ├── facility.js
│   ├── referral.js
│   ├── followUp.js
│   ├── consentLog.js
│   └── doctorAction.js
├── routes/
│   ├── authRoutes.js
│   ├── chatRoutes.js
│   ├── caseRoutes.js
│   ├── doctorRoutes.js
│   ├── facilityRoutes.js
│   └── followUpRoutes.js
├── middlewares/
│   ├── authMiddleware.js      # JWT verification
│   ├── errorHandler.js
│   └── logger.js
├── utils/
│   ├── geolocation.js         # haversine formula
│   ├── threshold.js           # config severity weights & thresholds
│   └── scheduler.js           # cron jobs / bull queue
└── .env
```

#### 5.2 Skema Basis Data (PostgreSQL)

Gunakan ORM seperti Sequelize atau Prisma. Skema utama:

- users (id, phone_number UNIQUE, otp_hash, is_verified, created_at)
- cases (id, user_id, status, severity_score, severity_class, doctor_id, created_at, updated_at)
- symptoms (id, case_id, fever_status BOOLEAN, onset_days INTEGER, dyspnea BOOLEAN, comorbidity BOOLEAN, score, raw_text JSONB)
- images (id, case_id, blob_url, heatmap_url, markers JSONB, quality_metrics JSONB, score, processed_at)
- doctors (id, name, specialty, email, password_hash, is_active)
- doctor_actions (id, case_id, doctor_id, action, notes, new_severity, timestamp)
- facilities (id, name, type, lat, lon, services JSONB, capacity_current, capacity_max)
- referrals (id, case_id, facility_id, status, referral_doc_url, created_at)
- follow_ups (id, case_id, next_send_time, frequency, status)
- consent_logs (id, user_id, consent_text, timestamp)

Relasi: users memiliki banyak cases; setiap case memiliki satu symptom dan banyak images; doctor_actions menautkan doctors ke cases; referrals menautkan cases ke facilities.

#### 5.3 Endpoints & Controller Logic (Contoh)

HTTP Method & Path — Deskripsi & Aksi Utama:

- POST /auth/send-otp — Menerima nomor, mengirim OTP via ACS, menyimpan otp_hash.
- POST /auth/verify-otp — Verifikasi OTP; jika benar, generate JWT dan buat user baru jika perlu.
- POST /chat/incoming — Endpoint webhook WA: terima pesan/attachment, identifikasi user_id, buat/temukan case, simpan pesan, proses langsung ke nluService/visionService sesuai tipe konten.
- GET /cases/:id — Ambil detail kasus termasuk severity_score, state, symptoms, images, doctor_actions.
- POST /cases/:id/doctor-review — Dokter memperbarui diagnosis: parameter new_severity, notes, action (approve, adjust, refer). Update cases.severity_class, simpan ke doctor_actions, trigger referral bila perlu.
- GET /facilities — Mengembalikan daftar fasilitas; optional query lat, lon untuk filtering.
- POST /cases/:id/follow-up — Membuat rencana follow-up manual atau mengubah jadwal.

Setiap controller memanggil service terkait (e.g., triageService.calculateSeverity(caseId)) yang mengandung logika domain. Middleware authMiddleware memastikan hanya dokter/hospital yang sah dapat mengakses endpoint tertentu.

#### 5.4 Opsi: Konsumen Event dengan Service Bus

Buat worker terpisah (dapat dijalankan sebagai proses Node berbeda) untuk memproses pesan antrian jika arsitektur memilih ASB:

- Ingestion Worker (ingestWorker.js): Mendengarkan ingest-queue; memeriksa tipe pesan (teks/gambar), memanggil nluService atau visionService, menyimpan hasil, mempublikasikan ID kasus ke ai-queue.
- AI Worker (triageWorker.js): Mendengarkan ai-queue; ketika kedua hasil (symptoms & images) tersedia, memanggil triageService.calculateSeverity, memperbarui DB, dan mem-publish ke notification-queue.
- Notification Worker (notifyWorker.js): Mengambil notification-queue; jika target dokter, kirim e‑mail/WA; jika target user, kirim pesan status triage atau follow-up. Gunakan modul @azure/communication-chat atau @azure/communication-sms.

Konsumen memanfaatkan pustaka @azure/service-bus untuk membuat receiver dan processMessage handler.

#### 5.5 Integrasi AI & Layanan Azure

- Panggil Copilot/LUIS via REST API: POST /language/analyze-conversations dengan teks; parsing respons JSON untuk entitas & confidence.
- Panggil Cognitive Services Vision: POST /vision/v3.2/analyze dengan URL blob; parameter visualFeatures=Objects,Color; implementasi Node dengan @azure/cognitiveservices-computervision.
- Pengunduhan media: WA menyediakan URL sementara; gunakan axios untuk mengunduh; upload ke Blob Storage via @azure/storage-blob, menghasilkan URL SAS.
- Simpan token & endpoint di .env dan load di config/azure.js.

#### 5.6 Pengujian & Deployment

- Unit testing: Gunakan Jest/Mocha untuk menguji setiap service (OTP, NLU, Vision, Triage). Mock API eksternal dengan sinon.
- Integration testing: Setup lingkungan staging Azure; gunakan Postman atau k6 untuk memverifikasi alur end‑to‑end.
- CI/CD: Gunakan GitHub Actions untuk lint, test, dan deploy. Step akhir mendorong container ke Azure Container Registry dan mengupdate App Service.
- Provisioning: Gunakan Terraform/Bicep untuk membuat resources (ACS, Blob Storage, PostgreSQL, Monitor; Service Bus jika dipakai). Pastikan RBAC tertata.

### 6. Observabilitas & Skala

- Metode Monitoring: Pasang Azure Monitor & Application Insights; log state_transition_duration, ai_response_time, doctor_action_latency, dan queue_length (jika ASB digunakan). Buat alert bila error rate tinggi; jika ASB digunakan, tambahkan alert backlog antrian.
- Skalabilitas: Default tanpa ASB dapat di-scale secara vertikal atau dengan memisahkan proses. Jika memilih ASB, gunakan antrian untuk horizontal scaling dan isolasi beban; proses berat bisa dipindah ke Azure Functions.
- Reliability: Tera ulang pesan jika gagal (Dead Letter Queue), implementasi idempotensi di worker. Simpan state intermediate di DB agar proses dapat dilanjutkan.

### 7. Rencana Tahapan Pengembangan

- Analisis – finalisasi backlog fitur berdasar bab 1–2 PDF: triage bot, AI preprocessing, dasbor dokter, referral engine, follow-up.
- Desain – buat diagram alur data dari input WA hingga verifikasi dokter; desain basis data; validasi wireframe dengan dokter.
- Implementasi Sprint – modul dibangun sebagai microservice: bot-ingestor, nlu-service, vision-service, triage-service, dashboard-service.
- Integrasi – hubungkan modul via Service Bus, uji end‑to‑end; pastikan setiap state machine berjalan; implementasi RBAC dan logging.
- MVP & Validasi – luncurkan pilot; lakukan survey lanjutan; sesuaikan threshold & bobot; siapkan dataset anonim untuk training.

### 8. Kesimpulan

Rencana ini memperluas blueprint sebelumnya dengan tingkat kedalaman yang lebih besar: merinci state machine percakapan, algoritma penilaian gejala dan gambar, pipeline asynchronous, desain database, serta integrasi Azure. Dengan mengikuti struktur modul dan arsitektur ini, tim dapat membangun backend Breathy di Node.js/Express secara modular dan terukur. Semua fungsi penting – mulai dari OTP & login, pencatatan gejala, analisis multimodal, triage ensemble, verifikasi dokter, orkestrasi rujukan, hingga follow‑up – terdefinisi jelas bersama algoritma, formula, bobot, threshold, dan pola integrasi yang dapat disesuaikan. Rencana ini juga menekankan keamanan, privasi, dan observabilitas, memastikan bahwa Breathy tidak hanya inovatif tetapi juga aman, etis, dan siap produksi.

Jika ada bagian yang masih memerlukan penjelasan atau pendalaman lebih lanjut, silakan beritahu saya.


Rujukan: tautan atau relative path ke dokumen desain dan file kode lain yang relevan.

Spesifikasi Teknis: definisikan fungsi yang harus ada, input/output, error handling, dan dependensi.

Keterbatasan: seperti gaya kode (callback vs async/await), batas baris, larangan penggunaan library tertentu, atau keharusan menulis komentar JSDoc.

Format Output: sebutkan tipe file (mis. .js, .md) dan struktur direktori tempat file harus disimpan.

Dengan kerangka kerja ini, AI dapat berperan sebagai pengembang dan project manager yang terarah: menggunakan dokumen desain sebagai sumber kebenaran, backlog untuk memprioritaskan pekerjaan, prompt untuk menghasilkan artefak baru, dan dokumen manajemen untuk melacak progres. Pengembang manusia tetap memiliki peran dalam validasi, supervisi, dan penyesuaian strategi ketika ada perubahan kebutuhan.
