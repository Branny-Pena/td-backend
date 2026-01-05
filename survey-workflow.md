# Survey Workflow & API Integration Guide

Base URL: `http://localhost:3000`

This document describes the end-to-end workflow to **create**, **publish**, **retrieve**, and **answer** a versioned Test Drive Survey from a frontend app.

## Key Concepts

### Brand (required)
All survey operations use a strictly validated enum:

```ts
enum SurveyBrand {
  MERCEDES_BENZ = 'MERCEDES-BENZ',
  ANDES_MOTOR = 'ANDES MOTOR',
  STELLANTIS = 'STELLANTIS',
}
```

You must send one of these exact strings. Any other value will fail validation.

### Survey (container)
A **Survey** is the top-level container:
- `name`
- `brand`
- `isActive`
- `status` (`draft` | `ready`)

Surveys do not contain questions directly.

### Survey Version (snapshot)
Questions live inside a **Survey Version**:
- A survey can have multiple versions
- Only one version should be `isCurrent = true`
- The “current” version is what the frontend should render for new responses
- **A version is immutable once responses exist**

### Survey Response (answers)
A **Survey Response**:
- Is linked to exactly one `testDriveForm`
- Is linked to exactly one `surveyVersion`
- Starts as `status = started`
- Becomes `status = submitted` after answers are posted
- **Cannot be modified after submission**

## Data Model Summary

- `Survey` (`surveys`)
  - 1:N `SurveyVersion`
- `SurveyVersion` (`survey_versions`)
  - N:1 `Survey`
  - 1:N `SurveyQuestion`
  - 1:N `SurveyResponse`
- `SurveyQuestion` (`survey_questions`)
  - N:1 `SurveyVersion`
  - 1:N `SurveyQuestionOption` (only for option question types)
- `SurveyQuestionOption` (`survey_question_options`)
  - N:1 `SurveyQuestion`
- `SurveyResponse` (`survey_responses`)
  - N:1 `SurveyVersion`
  - N:1 `TestDriveForm`
  - 1:N `SurveyAnswer`
- `SurveyAnswer` (`survey_answers`)
  - N:1 `SurveyResponse`
  - N:1 `SurveyQuestion`
  - N:1 `SurveyQuestionOption` (nullable)
  - Value fields:
    - `valueNumber` (for `number`)
    - `valueText` (for `text`)
    - `option` (for `option_single` / `option_multi`)

## Restrictions (Very Important)

### 1) Only one response per (surveyVersion, testDriveForm)
- `POST /survey-responses` is idempotent for a given pair:
  - If it already exists, it returns the existing response.

### 2) A response can only be submitted once
- `POST /survey-responses/:responseId/answers`:
  - rejects if `status = submitted`
  - rejects if answers already exist

### 3) Versions become immutable once they have responses
- `POST /survey-versions/:versionId/questions` is rejected if any responses exist for the version.

### 4) Answer validation depends on question type

Supported `type` values:
- `number`
- `text`
- `option_single`
- `option_multi`

Rules:
- `number`
  - send `valueNumber`
  - must be within `minValue` / `maxValue`
  - one answer row
- `text`
  - send `valueText`
  - required if `isRequired = true`
  - one answer row
- `option_single`
  - send exactly one `optionId` (as `optionIds: ["uuid"]`)
  - one answer row
- `option_multi`
  - send multiple `optionIds`
  - **one answer row per option**

### 5) Required questions must be answered
On submission, required questions must have answers, otherwise the API returns `400`.

## Admin Workflow (Create & Publish a Survey)

Publishing rule:
- Surveys can be edited while `status = draft`.
- Only surveys with `isActive = true` and `status = ready` are returned by `GET /surveys/active`.
- Publish by calling `PATCH /surveys/:surveyId` with body: `{ "status": "ready" }`.

### Step A1 — Create a survey
`POST /surveys`

Request:
```json
{
  "name": "Test Drive Qualification Survey",
  "brand": "MERCEDES-BENZ"
}
```

Response (example):
```json
{
  "id": "uuid",
  "name": "Test Drive Qualification Survey",
  "brand": "MERCEDES-BENZ",
  "isActive": true,
  "status": "draft",
  "createdAt": "2025-12-18T20:00:00.000Z",
  "updatedAt": "2025-12-18T20:00:00.000Z",
  "createdBy": null,
  "updatedBy": null
}
```

### Step A2 — Create a new version
`POST /surveys/:surveyId/versions`

Request:
```json
{
  "version": 1,
  "isCurrent": true,
  "notes": "Initial version"
}
```

Behavior:
- If `isCurrent = true`, the backend automatically sets all other versions of the same survey to `isCurrent = false`.

### Step A3 — Add questions to the version
`POST /survey-versions/:versionId/questions`

Number question example:
```json
{
  "type": "number",
  "label": "How would you rate your test drive experience?",
  "isRequired": true,
  "orderIndex": 1,
  "minValue": 1,
  "maxValue": 10
}
```

Single option example:
```json
{
  "type": "option_single",
  "label": "Did the advisor explain the vehicle clearly?",
  "isRequired": true,
  "orderIndex": 2,
  "options": [
    { "label": "Yes", "value": "YES" },
    { "label": "No", "value": "NO" }
  ]
}
```

Multi option example:
```json
{
  "type": "option_multi",
  "label": "What did you like about the experience?",
  "isRequired": false,
  "orderIndex": 3,
  "options": [
    { "label": "Vehicle performance", "value": "PERFORMANCE" },
    { "label": "Advisor attention", "value": "ADVISOR" }
  ]
}
```

Important:
- You cannot add questions once any responses exist for that version.

## Frontend Workflow (Render & Submit a Survey)

### Automatic behavior from Test Drive Forms (Backend)
When a `TestDriveForm` is created/updated with `status = submitted`, the backend:
1) Auto-creates a `SurveyResponse` (status `started`) for the form `brand` (fallback: `SURVEY_DEFAULT_BRAND`) and emails a public link to answer it: `${FRONTEND_BASE_URL}/survey/{surveyResponseId}`.
2) Sends an email to the customer with the **survey response ID** (for now; later this can be replaced by a link)
   - If the response already exists, it is reused and the email is still sent.

Implications for the frontend:
- You can still call `POST /survey-responses` (it will return the existing response for the same `(surveyVersionId, testDriveFormIdentifier)`).
- If you receive a `responseId` (from the email/link flow), you can load it via `GET /survey-responses/:id` and render its `surveyVersion`.

### Step F1 — Discover active surveys for the brand
`GET /surveys/active?brand=MERCEDES-BENZ`

This returns survey metadata only (no questions).

Backend filtering:
- Only `isActive = true` and `status = ready` surveys are returned.

Frontend recommendation:
- If multiple active surveys exist for the brand, choose the one your business rules prefer (usually the most recently created or a fixed survey ID configured in the frontend).

### Step F2 — Get the survey’s current version
`GET /surveys/:surveyId/versions/current`

If no current version exists, the API returns `404` and the frontend should show “no survey available”.

### Step F3 — Fetch the full survey structure
`GET /survey-versions/:versionId`

Response includes:
- `survey` info
- `questions` ordered by `orderIndex`
- `options` embedded per question (ordered by `orderIndex`)

Frontend rendering rules:
- `number`: render a numeric input / slider constrained to `[minValue..maxValue]`
- `text`: render a textarea
- `option_single`: radio group
- `option_multi`: checkbox group

### Step F4 — Start (or resume) a response
`POST /survey-responses`

Request:
```json
{
  "surveyVersionId": "uuid",
  "testDriveFormIdentifier": "uuid"
}
```

Response:
- A `SurveyResponse` object.
- If it already exists for the same `surveyVersionId + testDriveFormIdentifier`, you get the existing response.

Frontend recommendation:
- Call this when the user opens the survey screen.
- Persist `responseId` in your UI state (and optionally local storage).

### Step F5 — Submit answers (one-time)
`POST /survey-responses/:responseId/answers`

Request:
```json
{
  "answers": [
    { "questionId": "uuid", "valueNumber": 9 },
    { "questionId": "uuid", "optionIds": ["uuid"] },
    { "questionId": "uuid", "valueText": "Great experience overall" }
  ]
}
```

Submission rules:
- Required questions must be answered.
- Types must match the question type.
- `option_single` requires exactly one `optionId`.
- `option_multi` supports multiple `optionIds`.
- Once submitted, the response cannot be submitted again.

### Step F6 — (Optional) Read response back
`GET /survey-responses/:id`

Useful for debugging/admin screens and for frontend confirmation screens.

## Typical Integration Flow (Suggested)
1) Frontend knows the brand of the test drive (e.g. from vehicle brand or location).
2) `GET /surveys/active?brand=...`
3) Pick a survey (or show an error if none).
4) `GET /surveys/:surveyId/versions/current`
5) `GET /survey-versions/:versionId` to render.
6) `POST /survey-responses` with `(surveyVersionId, testDriveFormIdentifier)`.
7) User answers and submits once using `POST /survey-responses/:responseId/answers`.
