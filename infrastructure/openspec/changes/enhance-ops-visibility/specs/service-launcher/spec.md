# Delta for Laucher

## MODIFIED Requirements
### Requirement: Provide Aggregated Service Health
The system MUST enrich `GET /api/status` com metadados dos serviços monitorados.

#### Scenario: Aggregated status returned
- WHEN o Laucher avalia todos os serviços (incluindo Dashboard, Docusaurus, QuestDB, Prometheus, Grafana)
- THEN a resposta inclui cada serviço com `overallStatus`, `totalServices`, `degradedCount`, `downCount`, `lastCheckAt` e campos por serviço (`category`, `port`, `latencyMs`)
