# Error Handling and Logging

## Error Handling
- Uses NestJS HttpException classes
- Standard error response body
- Validation errors return 400 with structured messages

## Logging
- Nest Logger used in services
- Survey automation and email failures logged as warnings
- API exceptions logged with stack traces

## Auditability
- Audit fields present on all entities
- created_by and updated_by ready for auth integration
