# Deployment and DevOps

## Environments
- dev, qa, prod
- Isolated databases and environment variables per environment

## CI/CD Flow

```
Commit
  -> CI (lint + tests + build)
  -> Docker image build
  -> Push to registry
  -> Deploy to ECS (blue/green)
  -> Health checks
```

## Infrastructure
- AWS ECS for containerized deployment
- AWS RDS for PostgreSQL
- AWS S3 for file storage and exports

## Runtime Configuration
- Environment variables from ECS task definitions
- Secrets managed in AWS Secrets Manager

## Operational Notes
- Puppeteer requires Chromium dependencies in the container
- Excel generation is in-memory and may require resource tuning
