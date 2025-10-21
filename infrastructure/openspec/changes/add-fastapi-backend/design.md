> **Status Update (2025-10-18):** O pipeline de Analytics foi descontinuado. Esta mudança permanece apenas como registro histórico para adoção de FastAPI em serviços Python futuros.

## Context
The current TradingSystem uses Node.js/Express for all backend APIs. However, the system has growing ML and analytics components that are written in Python, and there's a need for high-performance async APIs with automatic documentation. FastAPI provides excellent integration with the Python ML ecosystem while maintaining the microservices architecture principles.

## Goals / Non-Goals
- Goals: 
  - Provide high-performance async APIs with automatic OpenAPI documentation
  - Enable seamless integration with Python ML libraries and analytics pipelines
  - Maintain existing Node.js services where they provide optimal value
  - Establish clear patterns for when to use FastAPI vs Express
- Non-Goals:
  - Replace all existing Express services with FastAPI
  - Introduce breaking changes to current API contracts
  - Migrate core trading services from C#/.NET

## Decisions
- Decision: Adopt FastAPI for new Python-native services and ML-heavy APIs
  - Rationale: Native Python integration eliminates serialization overhead between ML models and APIs
  - Rationale: Automatic OpenAPI/Swagger generation improves API documentation and developer experience
  - Rationale: Async/await support provides better performance for I/O-bound operations
- Decision: Maintain dual-framework architecture (Express + FastAPI)
  - Rationale: Express remains optimal for simple CRUD and webhook services
  - Rationale: FastAPI excels at ML inference, data processing, and complex APIs
  - Rationale: Gradual adoption allows skill development and proven patterns
- Decision: Reserve port range 4100-4199 for FastAPI services
  - Rationale: Clear separation from existing Express services (3100-3500 range)
  - Rationale: Simplifies local development and container orchestration

## Alternatives considered
- Django REST Framework: More opinionated, heavier weight, better for monolithic apps
- Flask: Requires more boilerplate for API features, less automatic documentation
- aiohttp: Lower-level, requires more implementation work for API features
- Stick with Express only: Would require Python-to-Node.js bridge for ML features

## Risks / Trade-offs
- [Complexity] → Mitigation: Clear service selection guidelines and template patterns
- [Skill diversity] → Mitigation: Comprehensive documentation and training materials
- [Dependency management] → Mitigation: Separate Python environments per service
- [Container overhead] → Mitigation: Optimized Docker base images and layer caching

## Migration Plan
1. Establish FastAPI patterns and templates
2. Implement pilot service (Analytics API) as proof of concept
3. Create service selection guidelines and decision matrix
4. Gradually migrate or create new services based on requirements
5. Update monitoring and observability patterns for mixed framework

## Open Questions
- Which existing service would benefit most from FastAPI migration as pilot?
- Should we establish shared Python libraries for common FastAPI patterns?
- How to handle API authentication consistently across Express and FastAPI services?
