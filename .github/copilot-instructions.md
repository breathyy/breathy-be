# Copilot Instructions for breathy-be

Purpose: make AI agents productive fast by codifying repo-specific patterns. Keep answers concise and cite the files below.

## Big picture
- Workspace-first repo: `javen-workspace/` holds design, checklists, and prompts to scaffold a Node.js/Express + PostgreSQL backend with Azure integrations (Blob, ACS WhatsApp, Vision, Copilot Studio). Orkestrasi dilakukan langsung di backend tanpa message bus eksternal.
- CaseStatus (process) vs severity_class (triage result). Do not conflate. CaseStatus: IN_CHATBOT → WAITING_DOCTOR → MILD/MODERATE/SEVERE.

## Key files
- Design: `javen-workspace/design/architecture_overview.md`, `.../api/api_specification.md`, `.../database/schema.md`, `.../algorithms/ensemble_triage.md`, `.../algorithms/followup_engine.md`, `.../security/guidelines.md`
- Delivery: `javen-workspace/management/integration_checklists/01_setup_local.md`..`13_end_to_end_testing.md`, module checklists in `.../management/checklists/`
- Prompts: `javen-workspace/prompts/code/*.md` (scaffolding contracts)

## Build flow (start here)
1) DB + skeleton: follow `02_database_schema.md` then `03_skeleton_backend.md` (add `GET /healthz`, add nodemon `npm run dev`).
2) Auth: patient OTP `POST /auth/patient/otp/request|verify`; provider JWT `POST /auth/login`, `GET /me` (see `management/checklists/checklist_auth.md`).
3) Media + webhook: Blob upload (SAS, QC), ACS inbound `POST /chat/incoming`.
4) NLU + Vision → triage: compute S_s and S_i; S = α·S_i + (1−α)·S_s (α and thresholds from env).
5) Doctor approval → follow-up: approve case, idempotent upsert of 7‑day tasks.

## Data & algorithms
- Schema tables: `cases`, `images`, `symptoms`, `daily_tasks`, `referrals`, `chat_messages`, `otp_codes` (enums CaseStatus, SputumCategory) in `design/database/schema.md`. Use `cases.status` (not `cases.state`).
- Ensemble triage: `design/algorithms/ensemble_triage.md` (CLEAR sputum baseline +0.10); persist `cases.severity_score` and `severity_class`; test state transitions.

## Conventions
- Structure: `controllers/`, `services/`, `routes/`, `models/`, `middlewares/`, `utils/`, `config/`.
- Async/await + central error handler; structured logging (App Insights); never log PII. Media via SAS URLs.
- RBAC roles: DOCTOR, HOSPITAL, ADMIN. Patient OTP flow is separate from provider login. State is WAITING_DOCTOR (exact).
- Env: `overview_integration.md` lists APP_PORT, DATABASE_URL, AZURE_*, TRIAGE_ALPHA, TRIAGE_THRESHOLDS.

## Dev tips
- No server yet—use the integration checklists to scaffold step‑by‑step. Add minimal ORM migrations that match schema.
- Windows PowerShell: chain commands with `;`.

## Integrations
- Blob: upload, SAS; store QC `quality_metrics` and markers in `images`.
- ACS WhatsApp: inbound `POST /chat/incoming`; outbound for OTP and status messages.
- Workflow orchestration: lakukan sinkron/asinkron langsung di backend; gunakan job queue ringan bila perlu (lihat `management/integration_checklists/07_queue_pipeline.md`).

## Examples (from prompts)
- Triage service: `services/triageService.js` (`calculateSeverity`, `applyDoctorApproval`, `transitionCaseState`) → `prompts/code/triage_service_prompt.md`.
- Security middleware: `middlewares/security.js` → `prompts/code/security_middleware_prompt.md`.
- Auth module (incl. patient OTP): `routes/authRoutes.js`, `middlewares/auth.js`, `services/authService.js` → `prompts/code/auth_module_prompt.md`.
