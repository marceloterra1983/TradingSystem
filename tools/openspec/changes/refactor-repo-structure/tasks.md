## 1. Discovery & Alignment
- [ ] Inventory Windows-native (C#/ProfitDLL) tooling to capture any path/config assumptions impacted by relocating JavaScript packages.
- [ ] Catalogue existing `.env.example` files, distinguishing shared vs. service-specific variables to inform the configuration hub.
- [ ] Audit GitHub workflows and local scripts to map current commands, cache paths, and dependencies.

## 2. Shared Configuration Hub
- [ ] Scaffold `config/shared/` with base ESLint, TypeScript, Prettier, Jest, and environment template files.
- [ ] Migrate one backend API service plus the dashboard frontend to consume the shared configs, validating lint/build/test commands.
- [ ] Document extension guidance for future services (README within `config/shared/`).

## 3. Service Manifest & Script Refactor
- [ ] Define a manifest (JSON/YAML) capturing service name, directory, port, and start command.
- [ ] Refactor local scripts (`scripts/start-services.sh`, `scripts/diagnose-services.sh`, etc.) to load the manifest instead of hard-coded paths/ports.
- [ ] Update GitHub workflows to rely on manifest-aware commands or workspace scripts, ensuring caching paths are adjusted.

## 4. Workspace Rollout & Documentation
- [ ] Introduce a root npm workspace, relocate JS/TS packages into the new hierarchy, and provide compatibility scripts during transition.
- [ ] Refresh onboarding/ops documentation with the new workspace commands, manifest usage, and deprecation timeline for legacy scripts.
- [ ] Run regression checks (local scripts + CI dry run) to confirm workflows operate with the new layout before removing compatibility paths.
