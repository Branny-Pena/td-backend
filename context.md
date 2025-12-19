# Project Context (td-backend)

This file is the **single source of truth** for how this backend is organized and how new changes must be implemented.

## Non‑Negotiables (Team Rules)
- Keep the current **feature-based structure**: everything lives under `src/modules/<feature>/`.
- Every feature must follow the same **NestJS pattern**: `dto/`, `entities/`, `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.module.ts`.
- Controllers must stay **thin** (routing + DTO parsing). Business logic goes in services.
- Any new endpoint (or endpoint behavior change) **must be documented** in `API.md`.
- Survey flow changes must also update `survey-workflow.md` (frontend integration narrative).
- Validation is global and strict: extra payload fields are rejected (see `src/main.ts`).

## Tech Stack
- NestJS (controllers/services/modules), TypeScript
- REST API
- TypeORM + PostgreSQL
- `@nestjs/config` for `.env` config
- Nodemailer for SMTP emails
- Puppeteer for PDF generation
- `patch-package` to patch a dependency issue (see “Known Gotchas”)

## Folder Structure (How to Add Things)
Root highlights:
- `src/main.ts`: bootstrap, timezone, CORS, global validation pipe
- `src/app.module.ts`: imports config + database + feature modules
- `src/config/database.config.ts`: maps env vars to DB config
- `src/common/`: truly shared code only (base entities, enums)
- `src/modules/*`: all features (each feature is self-contained)
- `API.md`: endpoint documentation (must stay current)
- `survey-workflow.md`: survey integration workflow (must stay current)
- `patches/`: `patch-package` patches applied at install time

When adding a new feature module:
1. Create `src/modules/<feature>/dto` for request/response DTOs.
2. Create `src/modules/<feature>/entities` for TypeORM entities.
3. Create controller/service/module in the same folder.
4. Register the module in `src/app.module.ts`.
5. Update `API.md` (+ `survey-workflow.md` if relevant).

## Runtime Defaults
- Server port: `process.env.PORT ?? 3001` (see `src/main.ts`).
- Timezone: Peru / Lima
  - `process.env.TZ` is set to `America/Lima` on bootstrap.
  - TypeORM connection uses `extra.options = '-c timezone=America/Lima'`.

## Configuration (Env Vars)
The app loads `.env` via `ConfigModule` (`src/app.module.ts`).
Reference file: `.env.example`.

Key variables:
- PostgreSQL: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- TypeORM dev schema: `DB_SYNCHRONIZE` (`true` in dev), `DB_DROP_SCHEMA` (dangerous)
- CORS: `CORS_ORIGINS` (comma separated; `*` means allow any), `CORS_CREDENTIALS`
- Surveys automation: `SURVEY_DEFAULT_BRAND` (must match the shared enum values)
- Frontend URL for survey emails: `FRONTEND_BASE_URL`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

## Shared App‑Wide Enum (Brands)
The brand enum used across the app is defined in:
- `src/common/enums/survey-brand.enum.ts`

Values (must match exactly):
- `MERCEDES-BENZ`
- `ANDES MOTOR`
- `STELLANTIS`

This enum is used by both:
- Surveys (create/retrieve/filter)
- Test drive forms (brand field used to decide which survey to attach/send)

## Database & ORM Conventions
- TypeORM is configured with `autoLoadEntities: true` and `synchronize` controlled by env.
- Schema is generated from entities on startup when `DB_SYNCHRONIZE=true`.
- All entities inherit audit fields from:
  - `src/common/entities/auditable.entity.ts`
  - Columns: `created_at`, `updated_at` (`timestamptz`), `created_by`, `updated_by` (UUID nullable)
  - `created_by` / `updated_by` are intentionally `null` for now (no auth/user context yet).

## Current Modules (Snapshot)
Feature modules currently present:
- `customers` (customers table, previously called users)
- `vehicles`
- `locations`
- `digital-signatures`
- `return-states`
- `images`
- `test-drive-forms`
- `surveys` (survey templates + versions + questions + responses + answers)
- `mailer` (shared SMTP service)

## Core Domain Model (High Level)
Entities and relationships (see also `API.md` “Models & Relationships”):
- Customer 1:N TestDriveForm
- Vehicle 1:N TestDriveForm
- CurrentLocation 1:N TestDriveForm
- TestDriveForm has optional 1:1 DigitalSignature (cascades on save)
- TestDriveForm has optional 1:1 ReturnState (cascades on save)
- ReturnState 1:N Image (images deleted when returnState deleted)
- Surveys:
  - Survey 1:N SurveyVersion
  - SurveyVersion 1:N SurveyQuestion
  - SurveyQuestion 1:N SurveyQuestionOption
  - SurveyVersion 1:N SurveyResponse
  - SurveyResponse 1:N SurveyAnswer

## Survey System Rules (Must Preserve)
The survey system is versioned and designed for “template + responses”:
- A Survey is a container (metadata only). Questions live in versions.
- A SurveyVersion is a frozen snapshot. Only one should be `isCurrent=true`.
- A SurveyResponse is tied to exactly one `(surveyVersion, testDriveForm)` (unique constraint).
- A submitted response is immutable (do not allow edits after status `submitted`).
- Question types:
  - `number`: stored in `value_number` (validate min/max if present)
  - `text`: stored in `value_text`
  - `option_single`: exactly 1 option selected (one answer row)
  - `option_multi`: multiple selections; **one answer row per option**
- Survey publishing:
  - `Survey.status` is `draft | ready`
  - Any “active survey” retrieval must return only `status=ready` (plus `isActive=true`).

## Test Drive Form Behaviors
- `TestDriveForm.status`: `draft | pending | submitted`.
- On transition to `submitted` or `pending`, the backend triggers automation:
  - It attempts to create a `SurveyResponse` for the form’s `brand`
  - It sends an email to the customer with the response id (and a URL if configured)
  - Implementation lives in `src/modules/test-drive-forms/test-drive-forms.service.ts`
  - Survey selection is “most recent created” survey for that brand, filtered by `isActive=true` and `status=ready`
- PDF generation endpoint exists and uses Puppeteer to render Spanish HTML into PDF.

## API Documentation Contract
- `API.md` is the canonical endpoint reference (routes, methods, payloads, response shapes).
- `survey-workflow.md` narrates the intended frontend workflow for surveys (admin creation → publish → customer response).
- Any change to DTOs, route paths, query params, response shape, or behavior must be reflected there immediately.

## Known Gotchas / Operational Notes
- Port mismatch can cause confusion: `src/main.ts` defaults to port `3001`. Keep `API.md` base URL aligned.
- `sql-highlight` patch:
  - There is a runtime issue where `typeorm` requires `sql-highlight` which may miss `./escapeHtml`.
  - The fix is implemented via `patch-package` in `patches/sql-highlight+6.1.0.patch`.
  - Do not remove `postinstall: patch-package` from `package.json`.
- If `npm start` fails with `EADDRINUSE`, another process is already using the configured port.
  - Fix by stopping the other process or changing `PORT`.

## Current “Actual Context” (What’s Already Implemented)
- Shared brand enum exists at `src/common/enums/survey-brand.enum.ts` and is used across surveys and test drive forms.
- Test drive forms include a `brand` column (enum) and `GET /test-drive-forms` supports filtering via query params.
- Surveys include a publishing status (`draft|ready`), and “active survey by brand” endpoints only return `ready` surveys.
- Survey submission bug previously caused `survey_answers.responseId` to become null; the submit flow avoids that by not re-saving the response entity in a way that breaks relations.
- Survey response retrieval endpoints include **sanitized customer info only** (id, name, email, phone) and must not leak sensitive fields (e.g., DNI).

