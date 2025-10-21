# Tasks: Relocate Docusaurus Structure

## Phase 1: Preparation & Analysis

- [x] 1.1 Audit all files in `/docs` to classify Docusaurus vs Content files
- [x] 1.2 Search codebase for all references to `docs/` path (scripts, configs, code)
- [x] 1.3 Document current directory structure and file counts
- [x] 1.4 Create backup of `/docs` directory before changes
- [x] 1.5 Verify Docusaurus currently builds successfully (`npm run build`)

## Phase 2: Directory Structure Migration

- [x] 2.1 Create `/docs/docusaurus/` directory structure
- [x] 2.2 Move `package.json` and `package-lock.json` to `/docs/docusaurus/`
- [x] 2.3 Move `docusaurus.config.ts` to `/docs/docusaurus/`
- [x] 2.4 Move `sidebars.ts` to `/docs/docusaurus/`
- [x] 2.5 Move `tsconfig.json` to `/docs/docusaurus/`
- [x] 2.6 Move `src/` directory to `/docs/docusaurus/src/`
- [x] 2.7 Move `static/` directory to `/docs/docusaurus/static/`
- [x] 2.8 Move `build/` directory to `/docs/docusaurus/build/` (if exists)
- [x] 2.9 Move `node_modules/` to `/docs/docusaurus/node_modules/`
- [x] 2.10 Move test/debug HTML files (logo tests) to `/docs/docusaurus/`
- [x] 2.11 Move `nginx.conf` to `/docs/docusaurus/` (if Docusaurus-specific)

## Phase 3: Docusaurus Configuration Updates

- [x] 3.1 Update `docusaurus.config.ts` to adjust content paths from `../` to `../../`
- [x] 3.2 Update `sidebars.ts` to adjust documentation paths
- [x] 3.3 Verify static assets paths in config
- [x] 3.4 Update any relative imports in `src/` components
- [x] 3.5 Test build in new location: `cd docs/docusaurus && npm run build`
- [x] 3.6 Test dev server: `cd docs/docusaurus && npm run start -- --port 3004`

## Phase 4: Infrastructure Scripts Update

- [x] 4.1 Update `start-all-services.sh` (change `cd docs` to `cd docs/docusaurus`)
- [x] 4.2 Update `start-all-stacks.sh` (change docs path)
- [x] 4.3 Update `status.sh` (update docs verification path)
- [x] 4.4 Update `check-services.sh` (update docs path)
- [x] 4.5 Update `scripts/start-all-services.sh` (in `/scripts` directory)
- [x] 4.6 Update `scripts/diagnose-services.sh`
- [x] 4.7 Update `scripts/start-services.sh`
- [x] 4.8 Update `scripts/stop-all-services.sh`
- [x] 4.9 Update `infrastructure/scripts/fix-docker-issues.sh`
- [x] 4.10 Update `infrastructure/scripts/README.md` (documentation)

## Phase 5: Backend Services Update

- [x] 5.1 Update Service Launcher (`frontend/apps/service-launcher/server.js`)
  - Update `defaultPath` for Docusaurus service
  - Update health check paths if needed
- [x] 5.2 Update Documentation API (`backend/api/documentation-api/`)
  - Search for hardcoded `/docs` paths
  - Update any file system operations
- [x] 5.3 Update TP Capital Signals CORS config (if hardcoded docs URL)
- [x] 5.4 Update B3 Market Data service docs references
- [x] 5.5 Update Library API config references

## Phase 6: Frontend Dashboard Update

- [x] 6.1 Update `DocsPage.tsx` instructions/examples (`cd docs/docusaurus`)
- [x] 6.2 Update `EscopoPage.tsx` documentation references
- [x] 6.3 Review other components for hardcoded docs paths
- [x] 6.4 Test frontend rendering after updates

## Phase 7: Documentation Updates

- [x] 7.1 Update `CLAUDE.md`
  - Update all `cd docs` commands to `cd docs/docusaurus`
  - Update project structure documentation
  - Update development commands section
- [x] 7.2 Update `SYSTEM-OVERVIEW.md`
  - Update documentation section
  - Update development commands
- [x] 7.3 Update `docs/README.md`
  - Update getting started instructions
  - Update npm command examples
- [x] 7.4 Update `guides/onboarding/START-SERVICES.md`
- [x] 7.5 Update `guides/onboarding/QUICK-REFERENCE.md`
- [x] 7.6 Update `guides/onboarding/GUIA-INICIO-DEFINITIVO.md`
- [x] 7.7 Update `docs/DOCUMENTATION-STANDARD.md`
- [x] 7.8 Update `docs/context/ops/service-startup-guide.md`
- [x] 7.9 Update `docs/context/ops/service-port-map.md`
- [x] 7.10 Update architecture diagrams (`docs/architecture/diagrams/`)
- [x] 7.11 Update `openspec/project.md` (if docs tooling mentioned)

## Phase 8: Docker & Infrastructure Config

- [x] 8.1 Update `compose.dev.yml` (if it references docs directory)
- [x] 8.2 Update any Docker-specific configs for docs volume mounts
- [x] 8.3 Update infrastructure (Docker Compose) configs (if applicable)
- [x] 8.4 Update any CI/CD workflows in `.github/workflows/`

## Phase 9: Testing & Validation

- [x] 9.1 Test Docusaurus build: `cd docs/docusaurus && npm run build`
- [x] 9.2 Test Docusaurus dev server: `cd docs/docusaurus && npm run start -- --port 3004`
- [x] 9.3 Verify all documentation renders correctly
- [x] 9.4 Test PlantUML diagram rendering
- [x] 9.5 Test Mermaid diagram rendering (if used)
- [x] 9.6 Run `start-all-services.sh` and verify docs service starts
- [x] 9.7 Run `status.sh` and verify docs health check passes
- [x] 9.8 Test Service Launcher starting/stopping Docusaurus
- [x] 9.9 Test frontend Dashboard accessing docs correctly
- [x] 9.10 Verify all internal links in documentation work
- [x] 9.11 Verify static assets (images, diagrams) load correctly

## Phase 10: Archive & Cleanup

- [x] 10.1 Update any archive references in `/archive` directory (low priority)
- [x] 10.2 Create migration guide documenting the change
- [x] 10.3 Update `.gitignore` if needed (adjust `docs/` patterns to `docs/docusaurus/`)
- [x] 10.4 Remove backup after confirming everything works
- [x] 10.5 Document new structure in project wiki/README

## Phase 11: Communication & Documentation

- [x] 11.1 Create change summary document
- [x] 11.2 Update team documentation/runbooks
- [x] 11.3 Mark this OpenSpec change as complete
- [x] 11.4 Archive this change proposal

## Dependencies

- **Phase 2** depends on **Phase 1** (need audit before moving)
- **Phase 3** depends on **Phase 2** (files must be moved first)
- **Phases 4-8** can be done in parallel after **Phase 3**
- **Phase 9** depends on **Phases 3-8** (all updates must be complete)
- **Phase 10** depends on **Phase 9** (testing must pass)

## Rollback Points

- After **Phase 2**: Can revert by moving files back
- After **Phase 3**: Must also revert config changes
- After **Phases 4-8**: Must revert all code/script changes
- After **Phase 9**: Production-ready, rollback becomes complex

## Success Criteria

✅ Docusaurus builds successfully in new location
✅ All services start and can access documentation
✅ Documentation renders correctly with all assets
✅ All scripts/commands updated and tested
✅ No broken links or missing resources
✅ Team can follow new commands from updated docs
