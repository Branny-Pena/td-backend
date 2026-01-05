# Architecture

## Style
- Modular monolith (NestJS modules per feature)
- RESTful API
- Layered architecture:
  - Controllers: routing and DTO validation
  - Services: business logic
  - Repositories: TypeORM data access

## High-Level Diagram

```
+------------------+        +---------------------+        +------------------+
|   Angular SPA    | <----> |   NestJS REST API   | <----> |   PostgreSQL     |
| (JWT in client)  |        |  Controllers/Services|        |   (RDS)          |
+------------------+        +----------+----------+        +------------------+
                                      |
                                      | integrations
                                      v
                         +------------------------------+
                         |  SMTP, Puppeteer, ExcelJS,   |
                         |  QR (qrcode), AWS S3 (assets)|
                         +------------------------------+
```

## Request Flow

```
HTTP Request
  -> Controller (DTO validation)
  -> Service (business logic)
  -> Repository (TypeORM)
  -> PostgreSQL
  -> Response
```

## Cross-Cutting Concerns
- Validation: global ValidationPipe (whitelist + forbid)
- Configuration: @nestjs/config
- Logging: Nest Logger
- Timezone: America/Lima

## Runtime Workflows
- Form submission triggers survey response creation and email
- PDF generation uses Puppeteer
- Excel report generation uses ExcelJS
- QR generation uses qrcode
