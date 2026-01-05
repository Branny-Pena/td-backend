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
- **Vehicle** (`vehicles`): `id`, `make`, `model`, `color`, `location`, `licensePlate`, `vinNumber`, `registerStatus` (`in progress`|`confirmed`)  
  - 1:N `TestDriveForm` (vehicle)
- **DigitalSignature** (`digital_signatures`): `id`, `signatureData`  
  - 1:1 optional in `TestDriveForm` (signature, cascades on save)
- **ReturnState** (`return_states`): `id`, `mileageImage`, `fuelLevelImage`  
  - 1:N `Image` (returnState, cascade on delete from returnState)  
  - 1:1 optional in `TestDriveForm` (returnState, cascade on save)
- **Image** (`images`): `id`, `url`, `role`, `returnState` (required FK)
- **TestDriveForm** (`test_drive_forms`): `id`, `brand` (`MERCEDES-BENZ`|`ANDES MOTOR`|`STELLANTIS`), `purchaseProbability` (int), `estimatedPurchaseDate` (`"1 mes" | "1 a 3 meses" | "Más de 3 meses"`), `observations`, `status` (`draft`|`submitted`), timestamps  
  - N:1 `Customer`, N:1 `Vehicle` (nullable; set during steps)  
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
  { "make": "Toyota", "model": "Corolla", "color": "Rojo", "location": "Lima", "licensePlate": "ABC-123", "vinNumber": "VIN123456789", "registerStatus": "confirmed" }
  ```
- `POST /vehicles/find-or-create` — returns `{ vehicle, created }` (when created, `vehicle.registerStatus` is `in progress`)
- `POST /vehicles/qr-code` - generate a QR code for vehicle info  
  ```json
  {
    "brand": "Toyota",
    "model": "Corolla",
    "color": "Rojo",
    "licensePlate": "ABC-123",
    "vin": "JTDBE32K720123456",
    "location": "Lima, Peru"
  }
  ```
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
  "color": "Rojo",
  "location": "Lima",
  "licensePlate": "ABC-123",
  "vinNumber": "VIN123456789",
  "registerStatus": "confirmed"
}
```


QR code response:
```json
{
  "payload": "{\"marca\":\"Toyota\",\"modelo\":\"Corolla\",\"color\":\"Rojo\",\"placa\":\"ABC-123\",\"vin\":\"JTDBE32K720123456\",\"ubicacion\":\"Lima, Peru\"}",
  "qrCodeDataUrl": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

## Reports
- `POST /reports/test-drive-forms/excel-email` - generate and email the Excel report
  ```json
  { "email": "ops@example.com" }
  ```
  Response: `200 OK` (empty body)
  Notes:
  - Uses all test drive forms for now (daily filter will be added later).
  - Status mapping: `submitted` -> "Finalizado", otherwise "En Progreso".
  - Columns are: Modelo, Placa, Color, Sucursal de origen, Fecha Inicio, Fecha Fin Programado, Mantenimiento/Reparacion, Motivo/Justificacion, Asesor, Sucursal del Asesor, Cliente, Horario reserva (test drive), Horario reserva RETORNO, Observaciones, Intencion de compra, Tiempo estimado de compra, Cantidad de Fotos retorno vehiculo, Estado test drive.

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
  { "mileageImageUrl": "https://.../mileage.jpg", "fuelLevelImageUrl": "https://.../fuel.jpg", "images": ["https://.../photo1.jpg"] }
  ```
- `GET /return-states`
- `GET /return-states/:id`
- `PATCH /return-states/:id` — same fields as create; replaces images array when provided
- `DELETE /return-states/:id`

Response:
```json
{
  "id": "uuid",
  "mileageImage": { "id": "uuid", "url": "https://.../mileage.jpg", "role": "mileage" },
  "fuelLevelImage": { "id": "uuid", "url": "https://.../fuel.jpg", "role": "fuel_level" },
  "images": [
    { "id": "uuid", "url": "https://.../photo1.jpg", "role": "vehicle", "returnState": "uuid" }
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
`customerId` and `vehicleId` are optional to allow creating a form from zero (initial step).
- `POST /test-drive-forms`  
  ```json
  {
    "brand": "MERCEDES-BENZ",
    "customerId": "uuid",
    "vehicleId": "uuid",
    "currentStep": "CUSTOMER_DATA",
    "signatureData": "<optional signature>",
    "purchaseProbability": 75,
    "estimatedPurchaseDate": "1 a 3 meses",
    "observations": "Prefers red",
    "status": "submitted",
    "returnState": {
      "mileageImageUrl": "https://.../mileage.jpg",
      "fuelLevelImageUrl": "https://.../fuel.jpg",
      "images": ["https://.../return1.jpg"]
    }
  }
  ```
  Note: `signatureData` should be a data URL like `data:image/png;base64,iVBORw0KG...`.
- `GET /test-drive-forms` - returns forms with related customer, vehicle, signature, returnState (+images)
- Optional query params for filtering:
  - `status` = `draft|submitted`
  - `brand` = `MERCEDES-BENZ|ANDES MOTOR|STELLANTIS`
  - `customerId` = UUID
  - `vehicleId` = UUID
  - `vehicleLicensePlate` = partial match (case-insensitive)
  - `vehicleVinNumber` = partial match (case-insensitive)
  - `vehicleLocation` = partial match (case-insensitive)
- `GET /test-drive-forms/:id` - same as above for one
- `GET /test-drive-forms/:id/pdf` - downloads a PDF (Spanish) with customer/vehicle info, signature, and return details (returns `application/pdf`)
- `POST /test-drive-forms/:id/email` - sends the test drive summary to the customer email (no request body for now; attaches the same PDF as the `/pdf` endpoint)
- `PATCH /test-drive-forms/:id` - any subset of the POST fields; `returnState` replaces images when provided
- `DELETE /test-drive-forms/:id`

Automatic survey + email behavior:
- When a test drive form is created (or updated) with `status` = `submitted`, the backend auto-creates a `SurveyResponse` (status `started`) for the form `brand` and sends an email to the customer with:
  - the survey response ID
  - a public link: `${FRONTEND_BASE_URL}/survey/{surveyResponseId}` (configure `FRONTEND_BASE_URL` in `.env`)
  - If `brand` is not provided on the form, `SURVEY_DEFAULT_BRAND` is used as a fallback.
  - If the `SurveyResponse` already exists, the backend reuses it and still sends the email (idempotent response creation).

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
  "currentStep": "FINAL_CONFIRMATION",
  "purchaseProbability": 75,
  "estimatedPurchaseDate": "1 a 3 meses",
  "observations": "Prefers red",
  "returnState": {
    "id": "uuid",
    "mileageImage": { "id": "uuid", "url": "https://.../mileage.jpg", "role": "mileage" },
    "fuelLevelImage": { "id": "uuid", "url": "https://.../fuel.jpg", "role": "fuel_level" },
    "images": [{ "id": "uuid", "url": "https://.../return1.jpg", "role": "vehicle" }]
  },
  "status": "submitted",
  "createdAt": "2025-12-11T17:49:49.000Z",
  "updatedAt": "2025-12-11T17:49:49.000Z"
}
```

Notes:
- `currentStep` allowed values: `CUSTOMER_DATA|VEHICLE_DATA|SIGNATURE_DATA|VALUATION_DATA|VEHICLE_RETURN_DATA|FINAL_CONFIRMATION`.
- If `status = submitted`, the backend forces `currentStep = FINAL_CONFIRMATION`.
- If `currentStep = FINAL_CONFIRMATION`, the backend forces `status = submitted`.

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
