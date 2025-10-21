> **Status Update (2025-10-18):** O pipeline de Analytics foi descontinuado; esta proposta permanece arquivada para referência histórica.

# OpenSpec Proposal: Implement FastAPI in TradingSystem

## Overview
This proposal suggests implementing FastAPI as the primary framework for new Python-based microservices in the TradingSystem project, particularly focusing on the Analytics Pipeline service. This change aims to improve API performance, documentation, and development productivity.

## Motivation
The current system uses Express.js for most API services. However, the Analytics Pipeline (planned for Python implementation) would benefit from FastAPI's:

1. Native Python async support
2. Automatic OpenAPI/Swagger documentation
3. Type validation via Pydantic
4. High performance for ML model serving
5. Better integration with Python analytics stack

## Confirmed Specifications

### Environment
- Running exclusively on WSL2
- Container-based deployment
- Generous resource allocation available

### Infrastructure
- Docker container with FastAPI
- Redis for caching
- Models stored within container
- Integration with existing monitoring stack

### Resource Allocation
- Initial CPU allocation: 4 cores (limit), 2 cores (reserved)
- Initial Memory allocation: 8GB (limit), 4GB (reserved)
- Scalable based on needs

## Implementation Scope
- Implement FastAPI for the Analytics Pipeline service
- Create standardized FastAPI project structure
- Integrate with existing monitoring and logging
- Maintain compatibility with current service communication
- Implement model versioning and backup strategies

## Non-Goals
- Replacing existing Express.js services
- Modifying current service interfaces
- Changes to the data capture or order manager services
- ProfitDLL integration (deferred for future phase)

## Technical Decisions

### Container Structure
```
/app/
├── models/
│   ├── production/    # Active models
│   ├── staging/      # Models under test
│   └── archive/      # Previous versions
├── api/              # FastAPI routes
├── core/            # Business logic
└── utils/           # Utilities
```

### Model Management
- Version control for ML models
- Automatic backup system
- Clear promotion path from staging to production

### Performance Optimizations
- WSL2-specific optimizations
- Redis caching layer
- Async operations
- Resource monitoring

## Impact
### Positive
- Improved performance for ML model serving
- Automatic API documentation
- Type safety and validation
- Better developer experience for Python services
- Structured model versioning

### Considerations
- New framework in the stack
- Team learning curve
- Integration with existing monitoring

## Dependencies
- Python 3.11+
- FastAPI
- Redis
- Docker/Docker Compose
- WSL2

## Current Limitations and Open Questions
- Specific latency requirements TBD
- Market data message format TBD
- Service authentication strategy TBD
- Specific monitoring metrics TBD
- Deployment frequency and process TBD

## References
- Current architecture: `docs/context/backend/architecture/overview.md`
- Analytics Pipeline (planned): `backend/services/analytics-pipeline/`