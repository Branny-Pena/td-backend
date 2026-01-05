# System Components

## Module Overview

### customers
- CRUD for customer records
- Linked to test drive forms and surveys

### vehicles
- CRUD for vehicles
- Find-or-create by license plate or VIN (normalized)
- QR generation for vehicle info
- Stores color and location (string)

### test-drive-forms
- Core workflow with wizard steps (currentStep)
- PDF generation endpoint
- Auto-creates survey response on submission

### digital-signatures
- Stores base64 signature data
- Linked to test drive form (1:1)

### return-states
- Return data and images
- Special images: mileageImage and fuelLevelImage

### images
- Stores image URLs with roles
- Related to return states

### surveys
- Surveys, versions, questions, answers
- Versioned and immutable after submission

### mailer
- SMTP integration
- Used by form submission and reports

### reports
- Generates Excel and emails it
- Uses all test drive forms

## Responsibilities and Boundaries
- Controllers: input validation and response formatting
- Services: orchestration and business rules
- Entities: persistence models and relationships
- Integrations: SMTP, PDF, Excel, QR

## Supporting Files
- `src/main.ts`: bootstrap, CORS, validation
- `src/app.module.ts`: module imports
- `src/common/*`: shared entities, enums
