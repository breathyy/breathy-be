# Spesifikasi API Breathy (Ringkas)

Catatan: Diselaraskan dengan UI login/personalization pasien, OTP via WhatsApp, dan dashboard dokter/RS. Terminologi: CaseStatus (state percakapan/kemajuan kasus) berbeda dengan severity_class (hasil klasifikasi triage).

Area utama:
- Auth (Pasien OTP):
	- POST /auth/patient/otp/request — body: { phone } → kirim OTP via ACS; simpan hash + expiry ke otp_codes.
	- POST /auth/patient/otp/verify — body: { phone, otp } → verifikasi; buat/temukan user; open case (IN_CHATBOT).
- Auth (Tenaga Kesehatan):
	- POST /auth/login — body: { email, password, role: "DOCTOR"|"HOSPITAL" } → JWT.
	- GET /me — header Authorization: Bearer <token> → profil + role.
- Chat Webhook (ACS WhatsApp):
	- POST /chat/incoming — payload ACS; bedakan text vs media; kaitkan ke case; publish untuk NLU/CV atau proses sinkron tergantung arsitektur.
- Cases:
	- GET /cases/:id — detail kasus, termasuk severity_score/class, status, ringkasan gejala dan citra.
	- POST /cases/:id/approve — body: { severity_adjustment?, notes? } — oleh DOCTOR; transisi WAITING_DOCTOR → (MILD|MODERATE|SEVERE).
	- GET /doctor/cases — query: status?, severity_class?, date_from?, date_to? — daftar kasus untuk dokter.
	- GET /hospital/cases — opsional, untuk RS melihat rujukan aktif.
- Tasks (Follow-Up 7 Hari):
	- GET /cases/:id/tasks — daftar tugas harian.
	- POST /cases/:id/tasks — generate/upsert tugas (idempoten; biasanya dipicu setelah approve).
	- POST /cases/:id/tasks/:taskId/complete — tandai selesai dengan timestamp dan optional notes.
- Referrals (Geolokasi):
	- GET /referrals/nearby?lat=..&lng=..&radius_km=..&type=hospital|pharmacy — list fasilitas terdekat.
	- POST /cases/:id/referrals — body: { facility_id, summary } — buat rujukan; notifikasi RS.
- Chat/History:
	- GET /cases/:id/chat — histori chat ringkas (metadata + tautan media aman).

Respon standar: { success, data, error }

Rujukan dokumen: [../architecture_overview.md](../architecture_overview.md)
