# Case Tasks Route (`/cases` — Follow-Up Tasks)

The task router is mounted under the same `/cases` prefix and requires provider authentication. It manages the seven-day follow-up task plan generated for mild/moderate cases.

## `GET /cases/:caseId/tasks`
- **Roles**: `DOCTOR`, `HOSPITAL`.
- **Purpose**: retrieve all tasks for a case.
- **Sample Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "task-1",
        "caseId": "5e8edd64-9e34-4586-be56-c605c372f4b3",
        "dayIndex": 0,
        "taskType": "CHECK_IN",
        "instruction": "Pastikan pasien mengirim update gejala harian",
        "done": false,
        "dueAt": "2025-10-17T03:00:00.000Z",
        "completedAt": null,
        "notes": null,
        "createdAt": "2025-10-16T13:45:05.000Z"
      }
    ]
  }
  ```

## `POST /cases/:caseId/tasks`
- **Roles**: `DOCTOR`.
- **Purpose**: idempotently regenerate the follow-up plan, optionally overriding severity.
- **Request Body**
  ```json
  {
    "severityClass": "MODERATE"
  }
  ```
  When omitted, the service falls back to the case severity. Existing tasks are upserted.
- **Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": [ { "id": "task-1", "dayIndex": 0, ... } ]
  }
  ```

## `POST /cases/:caseId/tasks/:taskId/complete`
- **Roles**: `DOCTOR`, `HOSPITAL`.
- **Purpose**: mark an individual task as completed and attach optional notes.
- **Request Body**
  ```json
  {
    "notes": "Pasien melaporkan batuk menurun."
  }
  ```
- **Response** (`200 OK`)
  ```json
  {
    "success": true,
    "data": {
      "id": "task-1",
      "done": true,
      "completedAt": "2025-10-17T09:10:00.000Z",
      "notes": "Pasien melaporkan batuk menurun."
    }
  }
  ```

## Errors
- Missing `caseId` or `taskId` → `400`.
- Unauthorized role → `403`.
- Underlying service errors (`followupService`) propagate as standard JSON errors.

**Referenced code**: `src/routes/task.route.js`, `src/controllers/task.controller.js`, `src/services/followup.service.js`.
