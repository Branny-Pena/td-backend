# Overview

## Purpose
Provide a production-ready backend for test drive management, surveys, reports, and digital assets (PDF, QR, email).

## System Context
- Frontend: Angular SPA
- Backend: NestJS REST API
- Database: PostgreSQL
- ORM: TypeORM
- Auth: JWT
- Cloud: AWS (S3, ECS, RDS)
- Environments: dev, qa, prod

## Scope
Included capabilities:
- Customer management
- Vehicle management (QR generation, normalized search)
- Test drive forms with wizard steps and PDF generation
- Return state with images
- Versioned surveys and responses
- Email notifications
- Excel report generation

Excluded capabilities:
- Payments
- Multi-tenant isolation
- Advanced analytics

## Goals
- Clear module boundaries and feature-based structure
- Consistent API behavior and validation
- Secure, auditable data handling
- Environment separation and operational readiness

## Stakeholders
- Product: workflow and data fields
- Backend: services, integrations, and data model
- Frontend: API integration and UX flows
- Security: auth, data protection, audit readiness
- Operations: deployment and monitoring
