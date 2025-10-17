# Case Route (`/cases`)

Endpoints mounted at `/cases` handle case lifecycle (details, approval, chat, media). Provider requests require a JWT (`Authorization: Bearer <token>`) with the listed roles. Patient chat uses the patient JWT issued via OTP.

## `GET /cases/:caseId`
- **Roles**: `DOCTOR`, `HOSPITAL`.
- **Purpose**: fetch case overview including latest symptoms, recent images, triage metadata.
- **Sample Request**
  ```http
  GET /cases/5e8edd64-9e34-4586-be56-c605c372f4b3 HTTP/1.1
  Authorization: Bearer <provider-token>
  ```
- **Sample Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "id": "5e8edd64-9e34-4586-be56-c605c372f4b3",
      "status": "WAITING_DOCTOR",
      "severityScore": 0.42,
      "severityClass": "MODERATE",
      "sputumCategory": "MUCOPURULENT",
      "startDate": "2025-10-14T03:00:00.000Z",
      "patient": {
        "id": "uuid-user",
        "phoneNumber": "+628111000777",
        "displayName": "Budi"
      },
      "doctor": null,
      "latestSymptoms": {
        "feverStatus": false,
        "onsetDays": 3,
        "dyspnea": true,
        "comorbidity": false,
        "rawText": {
          "body": "Sekarang suhu badanku 37.8 derajat..."
        },
        "createdAt": "2025-10-16T13:42:42.208Z"
      },
      "recentImages": [
        {
          "id": "uuid-image",
          "blobName": "cases/5e8.../img-123.jpg",
          "contentType": "image/jpeg",
          "fileSizeBytes": 245123,
          "qcStatus": "PENDING",
          "severityImageScore": 0.37,
          "visionRanAt": "2025-10-16T13:45:01.120Z",
          "downloadUrl": "https://storage...SAS"
        }
      ],
      "preprocessing": {
        "dataCompleteness": {
          "missingSymptoms": [],
          "readyForPreprocessing": true,
          "imageProvided": false,
          "imageRecommended": true,
          "needsMoreSymptoms": false,
          "updatedAt": "2025-10-16T13:42:42.334Z"
        }
      },
      "createdAt": "2025-10-14T03:00:00.000Z",
      "updatedAt": "2025-10-16T13:45:01.120Z"
    }
  }
  ```

## `POST /cases/:caseId/approve`
- **Roles**: `DOCTOR`.
- **Purpose**: finalize triage decision; optionally override severity class.
- **Request Body**
  ```json
  {
    "severityOverride": "SEVERE",
    "notes": "Rhonchi jelas, butuh rujukan segera."
  }
  ```
  - `severityOverride` optional, must be `MILD | MODERATE | SEVERE`.
  - `notes` optional string persisted in triage metadata.
- **Response** (`200 OK`)
  Returns updated case detail plus evaluation snapshot:
  ```json
  {
    "success": true,
    "data": {
      "case": { "id": "5e8...", "status": "SEVERE", "severityScore": 0.61, ... },
      "evaluation": {
        "severityScore": 0.61,
        "severityClass": "SEVERE",
        "components": {
          "symptomScore": 0.48,
          "imageScore": 0.74
        }
      }
    }
  }
  ```
  Automatically triggers follow-up task generation for `MILD|MODERATE` or clears tasks for `SEVERE`.

## `GET /cases/:caseId/chat`
- **Roles**: `DOCTOR`, `HOSPITAL`, `PATIENT` (must own case).
- **Query**: `limit` (1-200, default 100) to cap returned history.
- **Response**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "32377ccb-eccd-4e4a-88ef-9fc0d5eeb15e",
        "caseId": "5e8...",
        "type": "text",
        "content": "Tidak ada penyakit bawaan...",
        "meta": {
          "nlu": {
            "missingFields": ["feverStatus", "onsetDays", "dyspnea"]
          }
        },
        "createdAt": "2025-10-16T13:36:25.549Z"
      },
      {
        "id": "outbound-acs",
        "type": "text",
        "content": "Walau tidak ada darah di dahak Anda...",
        "meta": {
          "direction": "OUTBOUND",
          "provider": "ACS_WHATSAPP",
          "sendStatus": "failed"
        },
        "createdAt": "2025-10-16T13:36:22.929Z"
      }
    ]
  }
  ```
  Image messages include `media.download` (SAS URL) and processed `analysis` data when available.

## `POST /cases/:caseId/chat/upload-url`
- **Roles**: `PATIENT` (must own case).
- **Purpose**: request a short-lived SAS URL to upload sputum images from the portal.
- **Request Body**
  ```json
  {
    "contentType": "image/jpeg",
    "fileSizeBytes": 245123
  }
  ```
- **Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "uploadUrl": "https://storage...",
      "blobName": "cases/5e8.../img-123.jpg",
      "expiresAt": "2025-10-16T13:50:12.000Z"
    }
  }
  ```
  When storage is running in stub mode the `uploadUrl` can be `null` (the backend auto-imports the blob reference).

## `POST /cases/:caseId/chat`
- **Roles**: `PATIENT` only (must match session `caseId`).
- **Purpose**: send portal-originated text or media messages that trigger chatbot processing.
- **Request Body**
  ```json
  {
    "message": "Sekarang suhu badanku 37.8 derajat..."
  }
  ```
- **Media Payload**
  ```json
  {
    "type": "image",
    "blobName": "cases/5e8.../img-123.jpg",
    "caption": "Dahak terbaru",
    "contentType": "image/jpeg",
    "fileSizeBytes": 245123
  }
  ```
- **Response** (`201 Created`)
  ```json
  {
    "success": true,
    "data": {
      "caseId": "5e8...",
      "chatMessageId": "1c53a255-f527-48fa-8e5c-3f9c2717c2c4",
      "caseStatus": "WAITING_DOCTOR"
    }
  }
  ```
  Backend persists the message and enqueues any outbound bot prompts.

## `POST /cases/:caseId/images/upload-url`
- **Roles**: `DOCTOR`, `HOSPITAL` (patient uploads handled via different flow).
- **Purpose**: generate SAS PUT URL for sputum image upload.
- **Request Body**
  ```json
  {
    "contentType": "image/jpeg",
    "fileSizeBytes": 245123
  }
  ```
- **Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "uploadUrl": "https://storage...",
      "blobName": "cases/5e8.../img-123.jpg",
      "expiresAt": "2025-10-16T13:50:12.000Z"
    }
  }
  ```

## `POST /cases/:caseId/images`
- **Roles**: `DOCTOR`, `HOSPITAL`.
- **Purpose**: register metadata after upload so QC and Vision analysis can run.
- **Request Body**
  ```json
  {
    "blobName": "cases/5e8.../img-123.jpg",
    "source": "MANUAL",
    "contentType": "image/jpeg",
    "fileSizeBytes": 245123,
    "qualityMetrics": {
      "lighting": "good"
    },
    "markers": {
      "sputumRegion": [120, 85, 360, 420]
    }
  }
  ```
- **Response** (`201 Created`)
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid-image",
      "caseId": "5e8...",
      "blobName": "cases/5e8.../img-123.jpg",
      "download": {
        "downloadUrl": "https://storage...",
        "expiresAt": "2025-10-16T14:50:12.000Z"
      },
      "qcStatus": "PENDING",
      "severityImageScore": 0.37,
      "visionRanAt": "2025-10-16T13:45:01.120Z",
      "analysis": {
        "summary": "Area purulen terdeteksi",
        "provider": "VISION_SERVICE",
        "model": "breathy-vision-v1",
        "sputumCategory": "MUCOPURULENT",
        "sputumCategoryConfidence": 0.82
      }
    }
  }
  ```

## `GET /cases/:caseId/images`
- **Roles**: `DOCTOR`, `HOSPITAL`.
- **Purpose**: list stored images with latest QC and vision outputs.
- **Response**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid-image",
        "blobName": "cases/5e8.../img-123.jpg",
        "contentType": "image/jpeg",
        "qcStatus": "PENDING",
        "severityImageScore": 0.37,
        "visionRanAt": "2025-10-16T13:45:01.120Z",
        "download": {
          "downloadUrl": "https://storage...",
          "expiresAt": "2025-10-16T14:50:12.000Z"
        },
        "createdAt": "2025-10-16T13:44:58.511Z"
      }
    ]
  }
  ```

## Errors & Notes
- Missing `caseId` → `400`.
- Unauthorized roles → `403`.
- Case not found → `404`.
- Storage/vision not configured → `503` on upload/registration.
- Triage approval conflicts (already approved, no score) → `409`.

**Referenced code**: `src/routes/case.route.js`, `src/controllers/case.controller.js`, `src/controllers/case-chat.controller.js`, `src/controllers/case-image.controller.js`, `src/services/case-image.service.js`.
