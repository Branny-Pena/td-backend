# Security Design

## Authentication and Authorization
- JWT-based auth for API access
- Access tokens validated on every request
- Role-based authorization enforced via guards

## Token Handling
- Short-lived access tokens
- Refresh tokens stored securely by the client
- Token signing keys stored in environment variables

## Input Validation
- DTO validation with class-validator
- Global ValidationPipe:
  - whitelist: true
  - forbidNonWhitelisted: true
  - transform: true

## Data Protection
- Avoid logging sensitive fields (DNI, email)
- Use least-privilege database and SMTP credentials
- Enforce TLS at ingress

## AWS Security
- ECS tasks run in private subnets
- RDS in private subnets with security group restrictions
- S3 buckets enforce private access and signed URLs
