## Why
Portainer-managed containers and the legacy B3 System stack are no longer part of the target architecture. They add operational overhead, create broken references throughout tooling, and slow down local workflows. We need to remove every dependency, reference, and script tied to these systems so the project reflects the current direction.

## What Changes
- Remove Portainer-specific scripts, guides, stacks, and documentation.
- Remove the legacy B3 System stack (configs, docs, scripts, status/reporting references).
- Update tooling and dashboards to drop Portainer/B3 health checks, URLs, and UI affordances.
- Refresh documentation and onboarding material to match the simplified environment.

## Impact
- Affects infrastructure scripts (`infrastructure/`, `scripts/`, `start-*/stop-*` helpers).
- Requires updates to docs (`docs/context/...`, guides, onboarding) and frontend references.
- Introduces a new operations infrastructure spec capturing the Portainer-free architecture.
