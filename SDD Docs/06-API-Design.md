# API Design

## Standards
- RESTful resource naming
- JSON request/response bodies
- UUID identifiers
- DTO validation on all endpoints

## Versioning
- Base path is versioned: `/v1`
- Breaking changes require new version

## Errors
- Standard error response format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["validation message"],
  "path": "/v1/...",
  "timestamp": "2026-01-05T16:20:00.000Z"
}
```

## Pagination
- List endpoints support `page`, `pageSize`, `sort` (new endpoints must implement)
- Current endpoints that return full lists should be extended with pagination when required

## Base URL
- Environment-specific
- Local default: http://localhost:3001/v1

## Endpoint Summary

### Customers
- POST /customers
- GET /customers
- GET /customers/:id
- PATCH /customers/:id
- DELETE /customers/:id

### Vehicles
- POST /vehicles
- POST /vehicles/find-or-create
- POST /vehicles/qr-code
- GET /vehicles
- GET /vehicles/:id
- PATCH /vehicles/:id
- DELETE /vehicles/:id

### Test Drive Forms
- POST /test-drive-forms
- GET /test-drive-forms
- GET /test-drive-forms/:id
- GET /test-drive-forms/:id/pdf
- POST /test-drive-forms/:id/email
- PATCH /test-drive-forms/:id
- DELETE /test-drive-forms/:id

### Surveys
- POST /surveys
- PATCH /surveys/:id
- GET /surveys
- GET /surveys/active?brand=...
- POST /surveys/:surveyId/versions
- GET /surveys/:surveyId/versions/current
- POST /survey-versions/:versionId/questions
- GET /survey-versions/:versionId
- POST /survey-responses
- POST /survey-responses/:responseId/answers
- GET /survey-responses
- GET /survey-responses/:id

### Reports
- POST /reports/test-drive-forms/excel-email

## Source of Truth
- `API.md` contains full request and response details.
