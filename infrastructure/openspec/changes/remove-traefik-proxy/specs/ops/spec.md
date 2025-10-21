## ADDED Requirements
### Requirement: Core services must operate without Traefik
We MUST remove Traefik from local/docker stacks while keeping every core service reachable directly and documenting exposed ports for future reverse-proxy integration.

#### Scenario: Compose stack boots without Traefik
- **GIVEN** an engineer starts the infrastructure compose stack
- **WHEN** Traefik services are removed from the manifests
- **THEN** every existing service (docs, dashboard, APIs, monitoring) MUST remain reachable via direct host ports documented in ops guides

#### Scenario: Port catalogue maintained post-removal
- **GIVEN** Traefik is no longer available to proxy or expose dashboards
- **WHEN** we update operations documentation
- **THEN** the docs MUST include a current table of host ports and links for each service so that future reverse proxies can be configured explicitly
