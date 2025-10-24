## 1. Critical Port and Configuration Fixes (P0) [~2.5h]
- [ ] 1.1 Update default PORT from 9999 to 3500 in `frontend/apps/service-launcher/server.js:9`
- [ ] 1.2 Fix dotenv loading to point to project root instead of local `.env`
- [ ] 1.3 Update library-api port from 3102 to 3200 in SERVICE_TARGETS array
- [ ] 1.4 Update service-launcher self-reference from 9999 to 3500
- [ ] 1.5 Test integration with Dashboard at http://localhost:3103
- [ ] 1.6 Validate health checks: `curl http://localhost:3500/api/status`

## 2. Typo Correction: "Laucher" → "Launcher" (P1) [~2-3h]
- [ ] 2.1 Search and replace in `frontend/apps/service-launcher/server.js` (all console.log statements)
- [ ] 2.2 Update `frontend/apps/service-launcher/README.md` title and content
- [ ] 2.3 Update `frontend/apps/service-launcher/package.json` description field
- [ ] 2.4 Update `docs/context/backend/api/service-launcher/README.md`
- [ ] 2.5 Update startup scripts: `scripts/startup/start-service-launcher.{sh,ps1}`
- [ ] 2.6 Search and replace in all documentation files under `docs/`
- [ ] 2.7 Update CLAUDE.md references
- [ ] 2.8 Verify no "Laucher" remains: `rg -i "laucher" --type md --type js --type sh`

## 3. Environment Variables Documentation (P1) [~1h]
- [ ] 3.1 Create SERVICE_LAUNCHER section in `.env.example` (or root .env)
- [ ] 3.2 Document all SERVICE_LAUNCHER_* variables with comments
- [ ] 3.3 Add default values for each variable
- [ ] 3.4 Update README with environment variables table
- [ ] 3.5 Add inline comments in server.js showing default values
- [ ] 3.6 Test that defaults work when variables are not set

## 4. Structured Logging Implementation (P2) [~2h]
- [ ] 4.1 Install pino and pino-pretty as dependencies
- [ ] 4.2 Create logging utility module: `frontend/apps/service-launcher/src/utils/logger.js`
- [ ] 4.3 Replace all console.log with logger.info
- [ ] 4.4 Replace all console.error with logger.error
- [ ] 4.5 Add structured metadata to log calls (serviceName, port, latencyMs, etc.)
- [ ] 4.6 Configure log levels via SERVICE_LAUNCHER_LOG_LEVEL env var
- [ ] 4.7 Test log output format in development

## 5. Test Suite Implementation (P2) [~4-6h]
- [ ] 5.1 Create `tests/endpoints.test.js` for API endpoints
  - [ ] 5.1.1 Test GET /health returns 200 with correct payload
  - [ ] 5.1.2 Test GET /api/status returns aggregated status
  - [ ] 5.1.3 Test POST /launch validates required fields
  - [ ] 5.1.4 Test POST /launch returns 400 on missing fields
- [ ] 5.2 Create `tests/config.test.js` for configuration
  - [ ] 5.2.1 Test PORT loads from SERVICE_LAUNCHER_PORT
  - [ ] 5.2.2 Test default PORT is 3500 when not configured
  - [ ] 5.2.3 Test service targets are correctly configured
  - [ ] 5.2.4 Test .env loading from project root
- [ ] 5.3 Create `tests/integration.test.js` for Dashboard integration
  - [ ] 5.3.1 Test CORS allows Dashboard origin
  - [ ] 5.3.2 Test rate limiting works correctly
  - [ ] 5.3.3 Test health check timeouts
- [ ] 5.4 Update `package.json` with test scripts
- [ ] 5.5 Configure Jest/test runner properly
- [ ] 5.6 Aim for 80%+ code coverage
- [ ] 5.7 Add tests to CI pipeline (if exists)

## 6. Documentation Rewrite (P2) [~4-6h]
- [ ] 6.1 Create `frontend/apps/service-launcher/docs/` directory
- [ ] 6.2 Write `ARCHITECTURE.md` explaining design decisions
- [ ] 6.3 Write `API.md` documenting all endpoints with examples
- [ ] 6.4 Write `CONFIGURATION.md` listing all environment variables
- [ ] 6.5 Write `TROUBLESHOOTING.md` with common problems and solutions
- [ ] 6.6 Rewrite main README.md following template from audit
- [ ] 6.7 Add YAML frontmatter to docs per DOCUMENTATION-STANDARD.md
- [ ] 6.8 Create PlantUML diagrams:
  - [ ] 6.8.1 Service health check flow diagram
  - [ ] 6.8.2 Launch sequence diagram
  - [ ] 6.8.3 Component architecture diagram
- [ ] 6.9 Update `docs/context/backend/api/service-launcher/README.md` with links
- [ ] 6.10 Test all code examples in documentation
- [ ] 6.11 Validate diagrams render in Docusaurus

## 7. Validation and Testing (All Phases)
- [ ] 7.1 Run all tests: `npm test`
- [ ] 7.2 Test service startup: `npm start`
- [ ] 7.3 Validate health endpoint: `curl http://localhost:3500/health`
- [ ] 7.4 Validate status endpoint: `curl http://localhost:3500/api/status`
- [ ] 7.5 Test Dashboard integration at http://localhost:3103
- [ ] 7.6 Test launch endpoint with real service
- [ ] 7.7 Monitor logs for errors
- [ ] 7.8 Check rate limiting works
- [ ] 7.9 Validate CORS configuration
- [ ] 7.10 Test on both Windows and Linux/WSL

## 8. Deployment and Monitoring
- [ ] 8.1 Create PR with all changes
- [ ] 8.2 Request code review
- [ ] 8.3 Address review feedback
- [ ] 8.4 Deploy to test environment
- [ ] 8.5 Smoke test in test environment
- [ ] 8.6 Deploy to production
- [ ] 8.7 Monitor logs for 24 hours
- [ ] 8.8 Verify no regressions
- [ ] 8.9 Update CHANGELOG.md
- [ ] 8.10 Archive this OpenSpec change

## Notes
- **P0 tasks (1.x) are CRITICAL** - System doesn't work correctly without them
- **P1 tasks (2.x, 3.x) are HIGH PRIORITY** - Affects professionalism and configuration
- **P2 tasks (4.x, 5.x, 6.x) improve QUALITY** - Can be done incrementally
- Complete tasks in order, testing after each section
- Don't skip validation steps (7.x)
- Update task checkboxes as work is completed













