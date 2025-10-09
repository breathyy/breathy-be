# Prompt: Generate Geolocation & Referral Module

Rujukan: [../../design/architecture_overview.md](../../design/architecture_overview.md), [../../management/checklists/checklist_geolocation.md](../../management/checklists/checklist_geolocation.md)

Tujuan: Implementasi util jarak (Haversine), endpoint rekomendasi fasilitas terdekat, pembuatan entri referrals, dan notifikasi untuk SEVERE.

Keluaran yang diharapkan:
- services/geolocationService.js, services/referralService.js.
- routes/referralRoutes.js: GET /referrals/nearby, POST /cases/:id/referrals.

Batasan:
- Pastikan filter berdasarkan radius dan tipe fasilitas.
