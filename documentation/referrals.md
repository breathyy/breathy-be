# Referrals Route (`/referrals`)

The referrals router is currently a stub. All requests return HTTP 501 (`{ "error": "referrals route not implemented" }`).

Planned behavior (see `javen-workspace/design/api/api_specification.md`):
- `GET /referrals/nearby` — locate nearby facilities by coordinates.
- `POST /cases/:caseId/referrals` — create a referral record and notify the selected hospital.

Implementation pending checklist item in `javen-workspace/management/checklists/checklist_geolocation.md`.

**Referenced code**: `src/routes/referral.route.js`, `src/utils/create-stub.router.js`.
