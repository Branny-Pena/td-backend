# Scalability and Performance

## Current Characteristics
- Stateless API, horizontally scalable
- Synchronous processing for PDF and Excel

## Performance Strategies
- Add pagination to list endpoints
- Add DB indexes for frequently filtered fields
- Cache survey definitions in memory where appropriate

## Scaling Strategy
- Scale ECS service based on CPU/memory
- Use RDS read replicas if read traffic increases
- Offload heavy tasks to background jobs
