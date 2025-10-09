# Skema Database Breathy

Tabel utama:
- users (pasien minimal), doctor_users, hospital_users, hospitals
- cases: id, user_id, status, severity_score, severity_class, sputum_category, start_date, end_date
- images: id, case_id, blob_url, quality_metrics, markers, s_i, created_at
- symptoms: id, case_id, fever_status, onset_days, dyspnea, comorbidity, s_s
- daily_tasks: id, case_id, day_index, task_type, instruction, done, due_at, completed_at, notes
- referrals: id, case_id, facility_id, summary, created_at, status
- chat_messages: id, case_id, type(text|image), content/blob_ref, meta
- otp_codes: id, user_id, hash, expires_at, attempts

Enumerasi: CaseStatus(IN_CHATBOT, WAITING_DOCTOR, MILD, MODERATE, SEVERE), SputumCategory(GREEN, BLOOD_TINGED, VISCOUS, CLEAR, UNKNOWN)

Relasi FK dan indeks disarankan pada case_id dan created_at.
