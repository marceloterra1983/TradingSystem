## 1. Discovery
- [x] 1.1 Inventory all Traefik references (compose files, scripts, docs, monitoring)
- [x] 1.2 Confirm no runtime dependencies rely on Traefik-provided routing/metrics

## 2. Implementation
- [x] 2.1 Remove Traefik services and labels from compose/infrastructure manifests
- [x] 2.2 Adjust service ports/exposed URLs to work without Traefik
- [x] 2.3 Update automation/scripts (start/stop/status) to drop Traefik awareness

## 3. Documentation
- [x] 3.1 Refresh documentation to reflect direct service URLs and new port table
- [x] 3.2 Capture guidance for optional external reverse proxy integration (if needed)

## 4. Validation
- [x] 4.1 Run docker compose smoke tests ensuring services start without Traefik
- [x] 4.2 Update/validate specs and run `openspec validate remove-traefik-proxy --strict`
