# Auth Route (`/auth`)

Breathy exposes patient OTP and provider login flows under the `/auth` prefix. All responses follow `{ success, data, error }` format on success and error handling middleware on failure.

## `POST /auth/patient/otp/request`
- **Purpose**: start OTP login for a patient phone number.
- **Auth**: none.
- **Request Body**
  ```json
  {
    "phone": "+628111000777",
    "dryRun": true
  }
  ```
  - `phone` (string, required) in E.164 format. Will be normalized server-side.
  - `dryRun` (boolean, optional) when true returns OTP in response without calling ACS.
- **Success Response** (`202 Accepted`)
  ```json
  {
    "success": true,
    "data": {
      "expiresAt": "2025-10-16T13:41:12.345Z",
      "delivery": {
        "status": "dry-run",
        "reason": "ACS tidak tersedia, OTP dikembalikan pada respons"
      },
      "otp": "123456"
    }
  }
  ```
  When ACS WhatsApp is configured, `delivery` reflects provider status and `otp` is omitted unless `dryRun` is true.

## `POST /auth/patient/otp/verify`
- **Purpose**: validate OTP and issue a patient JWT tied to the active case.
- **Auth**: none.
- **Request Body**
  ```json
  {
    "phone": "+628111000777",
    "otp": "123456"
  }
  ```
- **Success Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "userId": "uuid-user",
      "caseId": "uuid-case",
      "caseStatus": "IN_CHATBOT",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "1h"
    }
  }
  ```
  The `token` must be sent as `Authorization: Bearer <token>` for patient-authenticated endpoints (e.g., `/cases/:caseId/chat`).

## `POST /auth/login`
- **Purpose**: authenticate provider users (DOCTOR, HOSPITAL, ADMIN).
- **Auth**: none.
- **Request Body**
  ```json
  {
    "email": "dokter@breathy.id",
    "password": "S3cret!",
    "role": "DOCTOR"
  }
  ```
- **Success Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "1h",
      "profile": {
        "id": "uuid-doctor",
        "userId": "uuid-user",
        "role": "DOCTOR",
        "email": "dokter@breathy.id",
        "fullName": "dr. Sehat",
        "specialty": "Pulmonologist",
        "phoneNumber": "+628111000777",
        "displayName": "dr. Sehat"
      }
    }
  }
  ```
  Hospital users receive `profile.hospital` with facility metadata instead of doctor fields.

## `GET /auth/me`
- **Purpose**: resolve provider profile from JWT.
- **Auth**: `Authorization: Bearer <provider-token>` (roles: DOCTOR, HOSPITAL, ADMIN).
- **Success Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-doctor",
      "userId": "uuid-user",
      "role": "DOCTOR",
      "email": "dokter@breathy.id",
      "fullName": "dr. Sehat",
      "specialty": "Pulmonologist",
      "phoneNumber": "+628111000777",
      "displayName": "dr. Sehat"
    }
  }
  ```

## Errors
- Validation issues (missing phone/otp/email) → `400` with `{ error: "..." }`.
- OTP throttled (`RESEND_COOLDOWN_SECONDS`) → `429`.
- ACS misconfiguration → `503` during OTP request.
- Provider credential mismatch → `401`.

**Referenced code**: `src/routes/auth.route.js`, `src/controllers/auth.controller.js`, `src/services/otp.service.js`, `src/services/auth.service.js`.
