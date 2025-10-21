## Why
- Tooling is fragmented across duplicated `package.json`, `.env.example`, and lint/TypeScript configs, causing drift and repeated maintenance.
- Local scripts and CI workflows hardcode per-service paths/ports, preventing an orderly move to shared npm workspaces and consistent start commands.
- After isolating history cleanup, the remaining repository re-organization needs its own coordinated change to modernize tooling while keeping services operational.

## What Changes
- Create a shared configuration hub under `config/` (ESLint, TypeScript, Prettier, Jest, environment templates) and migrate services to extend from it.
- Introduce a machine-readable service manifest capturing name, directory, port, and start command; refactor local scripts and CI to source it instead of hard-coded values.
- Adopt npm workspaces with a root `package.json`, relocating JavaScript/TypeScript services under a unified hierarchy while preserving compatibility scripts during rollout.
- Update onboarding and operational documentation to reflect the new structure, workspace commands, and manifest usage.

## Impact
- Teams gain a single source of truth for tooling and service metadata, reducing onboarding time and configuration drift.
- Scripts/workflows become layout-agnostic, simplifying future service additions and reducing copy/paste errors.
- Requires staged rollout and regression testing to ensure Windows-native components and existing automation keep functioning during the transition.
