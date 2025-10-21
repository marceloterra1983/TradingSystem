## Why
- Docker stacks still ship Traefik for routing even though we standardized on local-only services and MCP on :8080.
- Running Traefik conflicts with MCP port usage, adds operational overhead, and increases attack surface for a dashboard we no longer need.
- Documentation referencing Traefik dashboards/ports is now stale, creating confusion when onboarding or troubleshooting.

## What Changes
- Remove Traefik containers and related configs from docker compose stacks and infrastructure docs.
- Document a Traefik-free hosting model, including explicit port assignments for services that previously relied on Traefik routing.
- Provide guidance for future reverse proxy integration (if required) without keeping dormant code in repo.

## Impact
- Local developers lose built-in Traefik dashboard; must rely on service URLs directly.
- Compose stacks become simpler; existing service ports may need updates to remain accessible without proxy.
- Need to ensure no CI/CD or deployment scripts expect Traefik container names or labels.

## Open Questions
- Do we still need optional reverse proxy instructions for production? capture as future note or separate spec?
- Any automations (e.g., monitoring) scraping Traefik metrics port 8081 that require removal or replacement?
