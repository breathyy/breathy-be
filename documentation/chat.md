# Chat Route (`/chat`)

Azure Communication Services (ACS) inbound webhooks should target the `/chat` route. The controller validates the payload, persists chat history, and drives downstream NLU/vision processing.

## `POST /chat/incoming`
- **Purpose**: ingest messages (text or media) from ACS WhatsApp.#rah
- **Auth**: typically secured via inbound shared secret (configure at reverse proxy); no JWT expected.
- **Request Body**
  Payloads are forwarded mostly verbatim from ACS. Minimum fields:
  ```json
  {
    "from": "+628111000777",
    "type": "text",
    "text": {
      "body": "Halo, saya sesak napas saat malam hari"
    },
    "id": "acs-01HM3F9KZP3",
    "timestamp": "2025-10-16T13:35:59.120Z",
    "name": "Budi"
  }
  ```
  For media attachments:
  ```json
  {
    "from": "+628111000777",
    "type": "image",
    "image": {
      "id": "ACS_MEDIA_ID",
      "mediaUri": "https://...",
      "contentType": "image/jpeg",
      "fileSize": 245123
    }
  }
  ```
- **Processing Highlights**
  - Normalizes phone number and ensures a `users` record (`chat.service.ensureUser`).
  - Ensures an active case (`IN_CHATBOT` or `WAITING_DOCTOR`); creates new case otherwise.
  - Stores entry in `chat_messages` (and `images` when applicable).
  - Runs NLU extraction for text (`nluService`) and Vision analysis for images.
  - Auto-replies via WhatsApp if mandatory questionnaire items are missing.

- **Success Response** (`202 Accepted`)
  ```json
  {
    "success": true,
    "data": {
      "caseId": "5e8edd64-9e34-4586-be56-c605c372f4b3",
      "chatMessageId": "32377ccb-eccd-4e4a-88ef-9fc0d5eeb15e"
    }
  }
  ```
  The webhook should return HTTP 202 to ACS to prevent retries.

## Error Responses
- Missing `from` → `400`.
- Validation failures inside the processing pipeline bubble up via the Express error handler with `{ error: "..." }`.

**Referenced code**: `src/routes/chat.route.js`, `src/controllers/chat.controller.js`, `src/services/chat.service.js`.
