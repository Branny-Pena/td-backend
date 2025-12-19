# API Usage Guide

Base URL: `http://localhost:3000`

Notes:
- Validation is enabled (`ValidationPipe` with whitelist/forbid). Extra fields will be rejected.
- All IDs are UUIDs unless noted.
- `DB_SYNCHRONIZE` is enabled in development; ensure your `.env` is configured and Postgres is running.
- All models include audit fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy` (`createdBy`/`updatedBy` are `null` for now).
- Surveys automation uses `SURVEY_DEFAULT_BRAND` to decide which brand’s active survey to use when auto-creating a response.

## Models & Relationships
- **Customer** (`customers`): `id`, `firstName`, `lastName`, `dni`, `phoneNumber`, `email`  
  - 1:N `TestDriveForm` (customer)
- **Vehicle** (`vehicles`): `id`, `make`, `model`, `licensePlate`, `vinNumber`, `registerStatus` (`in progress`|`confirmed`)  
  - 1:N `TestDriveForm` (vehicle)
- **CurrentLocation** (`current_locations`): `id`, `locationName`  
  - 1:N `TestDriveForm` (location)
- **DigitalSignature** (`digital_signatures`): `id`, `signatureData`  
  - 1:1 optional in `TestDriveForm` (signature, cascades on save)
- **ReturnState** (`return_states`): `id`, `finalMileage`, `fuelLevelPercentage`  
  - 1:N `Image` (returnState, cascade on delete from returnState)  
  - 1:1 optional in `TestDriveForm` (returnState, cascade on save)
- **Image** (`images`): `id`, `url`, `returnState` (required FK)
- **TestDriveForm** (`test_drive_forms`): `id`, `brand` (`MERCEDES-BENZ`|`ANDES MOTOR`|`STELLANTIS`), `purchaseProbability` (int), `estimatedPurchaseDate` (`"1 mes" | "1 a 3 meses" | "Más de 3 meses"`), `observations`, `status` (`draft`|`pending`|`submitted`), timestamps  
  - N:1 `Customer`, N:1 `Vehicle`, N:1 `CurrentLocation` (all required)  
  - 1:1 `DigitalSignature` (optional, eager)  
  - 1:1 `ReturnState` (optional, eager; includes images)

- **Survey** (`surveys`): `id`, `name`, `brand` (`MERCEDES-BENZ`|`ANDES MOTOR`|`STELLANTIS`), `isActive`, `status` (`draft`|`ready`)
  - 1:N `SurveyVersion`
- **SurveyVersion** (`survey_versions`): `id`, `version` (int), `isCurrent` (bool), `notes`
  - N:1 `Survey`
  - 1:N `SurveyQuestion`
  - 1:N `SurveyResponse`
- **SurveyQuestion** (`survey_questions`): `id`, `type` (`number`|`text`|`option_single`|`option_multi`), `label`, `isRequired`, `orderIndex`, `minValue`, `maxValue`
  - N:1 `SurveyVersion`
  - 1:N `SurveyQuestionOption` (for option question types)
- **SurveyQuestionOption** (`survey_question_options`): `id`, `label`, `value`, `orderIndex`
  - N:1 `SurveyQuestion`
- **SurveyResponse** (`survey_responses`): `id`, `status` (`started`|`submitted`), `submittedAt`
  - N:1 `SurveyVersion`
  - N:1 `TestDriveForm`
  - 1:N `SurveyAnswer`
- **SurveyAnswer** (`survey_answers`): `id`, `valueNumber`, `valueText`
  - N:1 `SurveyResponse`
  - N:1 `SurveyQuestion`
  - N:1 `SurveyQuestionOption` (nullable; used for `option_single`/`option_multi`)

## Customers
- `POST /customers` — create  
  Body:  
  ```json
  { "firstName": "Ana", "lastName": "Lopez", "dni": "12345678", "phoneNumber": "999888777", "email": "ana@example.com" }
  ```
- `GET /customers` — list
- `GET /customers/:id` — get one
- `PATCH /customers/:id` — update (any subset of create fields)
- `DELETE /customers/:id` — remove

Response shape (example):
```json
{
  "id": "uuid",
  "firstName": "Ana",
  "lastName": "Lopez",
  "dni": "12345678",
  "phoneNumber": "999888777",
  "email": "ana@example.com"
}
```

## Vehicles
- `POST /vehicles` — create  
  ```json
  { "make": "Toyota", "model": "Corolla", "licensePlate": "ABC-123", "vinNumber": "VIN123456789", "registerStatus": "confirmed" }
  ```
- `POST /vehicles/find-or-create` — returns `{ vehicle, created }` (when created, `vehicle.registerStatus` is `in progress`)
- `GET /vehicles`
- `GET /vehicles/:id`
- `PATCH /vehicles/:id`
- `DELETE /vehicles/:id`

Response:
```json
{
  "id": "uuid",
  "make": "Toyota",
  "model": "Corolla",
  "licensePlate": "ABC-123",
  "vinNumber": "VIN123456789",
  "registerStatus": "confirmed"
}
```

## Locations
- `POST /locations` — create  
  ```json
  { "locationName": "Lima Center" }
  ```
- `GET /locations`
- `GET /locations/:id`
- `PATCH /locations/:id`
- `DELETE /locations/:id`

Response:
```json
{ "id": "uuid", "locationName": "Lima Center" }
```

## Digital Signatures
- `POST /digital-signatures` — create  
  ```json
  { "signatureData": "<base64 or data string>" }
  ```
- `GET /digital-signatures`
- `GET /digital-signatures/:id`
- `PATCH /digital-signatures/:id`
- `DELETE /digital-signatures/:id`

Response:
```json
{ "id": "uuid", "signatureData": "<data>" }
```

## Return States
- `POST /return-states` — create  
  ```json
  { "finalMileage": 12000, "fuelLevelPercentage": 80, "images": ["https://.../photo1.jpg"] }
  ```
- `GET /return-states`
- `GET /return-states/:id`
- `PATCH /return-states/:id` — same fields as create; replaces images array when provided
- `DELETE /return-states/:id`

Response:
```json
{
  "id": "uuid",
  "finalMileage": 12000,
  "fuelLevelPercentage": 80,
  "images": [
    { "id": "uuid", "url": "https://.../photo1.jpg", "returnState": "uuid" }
  ]
}
```

## Images
Requires an existing return state.
- `POST /images`  
  ```json
  { "url": "https://.../photo.jpg", "returnStateId": "uuid-of-return-state" }
  ```
- `GET /images`
- `GET /images/:id`
- `PATCH /images/:id` — update `url` and/or `returnStateId`
- `DELETE /images/:id`

Response:
```json
{
  "id": "uuid",
  "url": "https://.../photo.jpg",
  "returnState": { "id": "uuid" }
}
```

## Test Drive Forms
Requires existing customer, vehicle, and location.
- `POST /test-drive-forms`  
  ```json
  {
    "brand": "MERCEDES-BENZ",
    "customerId": "uuid",
    "vehicleId": "uuid",
    "locationId": "uuid",
    "signatureData": "<optional signature>",
    "purchaseProbability": 75,
    "estimatedPurchaseDate": "1 a 3 meses",
    "observations": "Prefers red",
    "status": "submitted",
    "returnState": {
      "finalMileage": 12345,
      "fuelLevelPercentage": 70,
      "images": ["https://.../return1.jpg"]
    }
  }
  ```
  Note: `signatureData` should be a data URL like `data:image/png;base64,iVBORw0KG...`.
- `GET /test-drive-forms` - returns forms with related customer, vehicle, location, signature, returnState (+images)
- Optional query params for filtering:
  - `status` = `draft|pending|submitted`
  - `brand` = `MERCEDES-BENZ|ANDES MOTOR|STELLANTIS`
  - `customerId` = UUID
  - `vehicleId` = UUID
  - `locationId` = UUID
  - `vehicleLicensePlate` = partial match (case-insensitive)
  - `vehicleVinNumber` = partial match (case-insensitive)
- `GET /test-drive-forms/:id` - same as above for one
- `GET /test-drive-forms/:id/pdf` - downloads a PDF (Spanish) with customer/vehicle info, signature, and return details (returns `application/pdf`)
- `POST /test-drive-forms/:id/email` - sends the test drive summary to the customer email (no request body for now; attaches the same PDF as the `/pdf` endpoint)
- `PATCH /test-drive-forms/:id` - any subset of the POST fields; `returnState` replaces images when provided
- `DELETE /test-drive-forms/:id`

Automatic survey + email behavior:
- When a test drive form is created (or updated) with `status` = `pending` or `submitted`, the backend auto-creates a `SurveyResponse` (status `started`) for the form `brand` and sends an email to the customer with:
  - the survey response ID
  - a public link: `${FRONTEND_BASE_URL}/survey/{surveyResponseId}` (configure `FRONTEND_BASE_URL` in `.env`)
  - If `brand` is not provided on the form, `SURVEY_DEFAULT_BRAND` is used as a fallback.

Email configuration (required environment variables):
- `SMTP_HOST` (string)
- `SMTP_PORT` (number; default `587`)
- `SMTP_SECURE` (`true|false`; optional; defaults to `true` when port is `465`)
- `SMTP_USER` (string; optional; if set, `SMTP_PASS` must be set)
- `SMTP_PASS` (string; optional)
- `SMTP_FROM` (string; e.g. `no-reply@example.com`)

Response (example):
```json
{
  "id": "uuid",
  "customer": { "id": "uuid", "firstName": "Ana", "lastName": "Lopez", "dni": "12345678", "phoneNumber": "999888777", "email": "ana@example.com" },
  "vehicle": { "id": "uuid", "make": "Toyota", "model": "Corolla", "licensePlate": "ABC-123", "vinNumber": "VIN123456789" },
  "location": { "id": "uuid", "locationName": "Lima Center" },
  "signature": { "id": "uuid", "signatureData": "<data>" },
  "purchaseProbability": 75,
  "estimatedPurchaseDate": "1 a 3 meses",
  "observations": "Prefers red",
  "returnState": {
    "id": "uuid",
    "finalMileage": 12345,
    "fuelLevelPercentage": 70,
    "images": [{ "id": "uuid", "url": "https://.../return1.jpg" }]
  },
  "status": "submitted",
  "createdAt": "2025-12-11T17:49:49.000Z",
  "updatedAt": "2025-12-11T17:49:49.000Z"
}
```

## Surveys (Versioned)
Notes:
- Survey versions are immutable once they have responses (adding questions will be rejected).
- Survey responses become immutable after submission (cannot submit twice).
- For `option_multi`, one answer row is stored per selected option.

### Create Survey (Admin)
- `POST /surveys`
```json
{ "name": "Test Drive Qualification Survey", "brand": "MERCEDES-BENZ" }
```
Notes:
- New surveys start as `status = draft`.
- Publish by calling `PATCH /surveys/:surveyId` with body `{ "status": "ready" }`.

### Retrieve Active Surveys by Brand (Frontend)
- `GET /surveys/active?brand=MERCEDES-BENZ`
Notes:
- Returns only surveys with `isActive = true` and `status = ready`.

### Create Survey Version (Admin)
- `POST /surveys/:surveyId/versions`
```json
{ "version": 1, "isCurrent": true, "notes": "Initial version" }
```
If `isCurrent=true`, all other versions of the same survey are set to `false`.

### List Survey Versions (Admin)
- `GET /surveys/:surveyId/versions`

### Retrieve Current Version of a Survey (Frontend)
- `GET /surveys/:surveyId/versions/current`

### Retrieve Full Survey Structure (Frontend)
- `GET /survey-versions/:versionId` (returns version + ordered questions + options)

### Add Question to a Version (Admin)
- `POST /survey-versions/:versionId/questions`

Number question:
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

Option question:
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

### Start a Survey Response (Frontend)
- `POST /survey-responses`
```json
{ "surveyVersionId": "uuid", "testDriveFormIdentifier": "uuid" }
```
Only one response exists per `(surveyVersionId, testDriveFormIdentifier)`; calling this again returns the existing response.

### Submit Survey Answers (Frontend)
- `POST /survey-responses/:responseId/answers`
```json
{
  "answers": [
    { "questionId": "uuid", "valueNumber": 9 },
    { "questionId": "uuid", "optionIds": ["uuid"] },
    { "questionId": "uuid", "valueText": "Great experience overall" }
  ]
}
```
Rules:
- Validates answer type against the question type.
- `number` uses `valueNumber` and respects `minValue`/`maxValue`.
- `text` uses `valueText` (required when the question is required).
- `option_single` requires exactly one `optionId`.
- `option_multi` allows multiple `optionIds` (one stored row per option).

### Get Survey Response (Debug / Admin)
- `GET /survey-responses/:id` (includes version + answers + selected options)
Notes:
- Includes `testDriveForm.customer` with only: `id`, `firstName`, `lastName`, `email`, `phoneNumber`.

### List Survey Responses (Debug / Admin)
- `GET /survey-responses?status=submitted`
- Optional filters: `surveyId`, `surveyVersionId`
Notes:
- Each item includes `testDriveForm.customer` with only: `id`, `firstName`, `lastName`, `email`, `phoneNumber`.

## Quick Sequence Example
1) Create customer, vehicle, and location.  
2) Create a test drive form with their IDs (optionally include signature/returnState).  
3) Later, update the form with a return state once the vehicle is returned.  
4) Fetch `/test-drive-forms` to see nested relations.  
5) Manage standalone return states and images if needed via their endpoints.
