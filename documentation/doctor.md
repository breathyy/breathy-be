# Doctor Route (`/doctor`)

These endpoints serve the doctor dashboard. JWT with role `DOCTOR` (or `ADMIN` for read-only access) is required.

## `GET /doctor/cases`
- **Purpose**: list cases with filtering, pagination, and summary counts.
- **Query Parameters**
  - `status`: CSV or repeated values (`WAITING_DOCTOR`, `IN_CHATBOT`, `MILD`, `MODERATE`, `SEVERE`). Default is `WAITING_DOCTOR` when omitted.
  - `severityClass`: CSV of severity classes to include.
  - `dateFrom` / `dateTo`: ISO timestamp boundaries (applied to `created_at`).
  - `search`: free text; matches patient display name or phone (digits sanitized).
  - `assigned`: `ALL` | `MINE` | `UNASSIGNED`. Default `ALL`.
  - `page` / `pageSize`: pagination (defaults `page=1`, `pageSize=20`, max `pageSize=100`).
- **Sample Request**
  ```http
  GET /doctor/cases?status=WAITING_DOCTOR&assigned=UNASSIGNED&page=1&pageSize=10 HTTP/1.1
  Authorization: Bearer <doctor-token>
  ```
- **Sample Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "pagination": {
        "page": 1,
        "pageSize": 10,
        "total": 4,
        "totalPages": 1
      },
      "filtersApplied": {
        "status": ["WAITING_DOCTOR"],
        "severityClass": [],
        "dateFrom": null,
        "dateTo": null,
        "search": null,
        "assigned": "UNASSIGNED"
      },
      "summaries": {
        "byStatus": {
          "WAITING_DOCTOR": 4
        },
        "bySeverity": {
          "MODERATE": 3,
          "SEVERE": 1
        }
      },
      "cases": [
        {
          "id": "5e8edd64-9e34-4586-be56-c605c372f4b3",
          "status": "WAITING_DOCTOR",
          "severityClass": "MODERATE",
          "severityScore": 0.42,
          "sputumCategory": "MUCOPURULENT",
          "createdAt": "2025-10-14T03:00:00.000Z",
          "updatedAt": "2025-10-16T13:45:01.120Z",
          "patient": {
            "id": "uuid-user",
            "displayName": "Budi",
            "phoneNumber": "+628111000777"
          },
          "latestMessageAt": "2025-10-16T13:42:42.708Z",
          "triageMetadata": {
            "questionnaire": {
              "awaitingConfirmation": false
            }
          }
        }
      ]
    }
  }
  ```

## `POST /doctor/cases/:caseId/claim`
- **Purpose**: assign a waiting case to the authenticated doctor and stamp claim metadata.
- **Sample Request**
  ```http
  POST /doctor/cases/5e8edd64-9e34-4586-be56-c605c372f4b3/claim HTTP/1.1
  Authorization: Bearer <doctor-token>
  ```
- **Success Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "id": "5e8edd64-9e34-4586-be56-c605c372f4b3",
      "status": "WAITING_DOCTOR",
      "severityClass": "MODERATE",
      "severityScore": 0.42,
      "sputumCategory": "MUCOPURULENT",
      "doctorId": "uuid-doctor",
      "claimedAt": "2025-10-16T14:02:12.511Z"
    }
  }
  ```

## Errors
- Missing `Authorization` header → `401`.
- Unsupported `role` in token → `403`.
- Case already assigned / not claimable → `409`.
- Invalid filters → silently ignored; invalid dates default to null.

**Referenced code**: `src/routes/doctor.route.js`, `src/controllers/doctor-case.controller.js`.
