# Delta for Laucher

## ADDED Requirements
### Requirement: Provide Aggregated Service Health
The system MUST enrich `GET /api/status` with aggregate health metadata alongside the service list.

#### Scenario: Aggregated status returned
- WHEN the Laucher evaluates all managed services
- THEN the response body includes fields `overallStatus`, `totalServices`, `degradedCount`, and `lastCheckAt` (UTC timestamp)
- AND `overallStatus` reflects `ok`, `degraded`, or `down` based on the worst service state.
