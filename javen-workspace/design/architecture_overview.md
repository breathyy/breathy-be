# Ikhtisar Arsitektur Breathy (Backend)

Dokumen ini merangkum komponen backend Breathy: aplikasi Node.js/Express, PostgreSQL, Azure Storage (Blob), Azure Communication Services (WhatsApp), layanan NLU (Copilot Studio/LUIS), Computer Vision, serta opsional Azure Service Bus untuk pipeline terpisah. Arsitektur mendukung chatbot intake → analisis AI → verifikasi dokter → follow-up 7 hari → rujukan.

 Komponen utama:
- API Gateway/Express: routes untuk chat webhook, kasus, dokter/RS, tugas harian, auth.
- Database PostgreSQL: tabel users, doctor_users, hospital_users, hospitals, cases, images, symptoms, daily_tasks, referrals, chat_messages, otp_codes.
- Media pipeline: upload ke Blob Storage, QC, SAS URL, inferensi CV.
- NLU dan Vision: hitung S_s dan S_i; gabungan S menentukan kelas keparahan.
- State machine kasus (CaseStatus): IN_CHATBOT → WAITING_DOCTOR → MILD/MODERATE/SEVERE. Severity_class adalah hasil klasifikasi triage yang diset setelah approval dokter. Jangan menyamakan CaseStatus dengan severity_class.
- Observabilitas: Application Insights.
- Keamanan: JWT/RBAC, sanitasi PII, Key Vault (prod), HTTPS.

Lihat juga: [./algorithms/ensemble_triage.md](./algorithms/ensemble_triage.md), [./api/api_specification.md](./api/api_specification.md), [./database/schema.md](./database/schema.md).
