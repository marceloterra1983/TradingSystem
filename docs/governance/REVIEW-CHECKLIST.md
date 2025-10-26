# Documentation Review Checklist - Phase 5

**Review Period**: 2025-10-24 to 2025-11-15 (3 weeks)
**Objective**: Validate all migrated content before docs launch
**Reviewers**: DocsOps, ProductOps, ArchitectureGuild, FrontendGuild, BackendGuild

## Review Criteria

**Content Quality**:
- [ ] All sections complete (no placeholder text)
- [ ] Technical accuracy verified
- [ ] Examples tested and working
- [ ] Cross-references valid and up-to-date
- [ ] No TODO/TBD/FIXME markers (or documented in backlog)

**Frontmatter Compliance**:
- [ ] Required fields present: title, description, tags, owner, lastReviewed
- [ ] lastReviewed date is current (within 30 days)
- [ ] Tags are relevant and consistent
- [ ] Owner assignment is correct

**Formatting & Style**:
- [ ] Markdown syntax valid (no broken tables, lists)
- [ ] Code blocks have language identifiers
- [ ] Headings follow hierarchy (no skipped levels)
- [ ] Links use relative paths for internal references
- [ ] Images/diagrams render correctly

**Automation Compliance**:
- [ ] Generated sections have proper markers (BEGIN/END AUTO-GENERATED)
- [ ] Manual edits outside generated sections
- [ ] Timestamps current (for generated content)

## Chapter 1: Apps Documentation (20 files)

**Owner**: DocsOps
**Reviewer**: Backend Guild (technical validation)
**Timeline**: Week 1 (Oct 24-31)

### Files to Review

**Workspace App** (10 files):
- [ ] `apps/workspace/overview.mdx` - Purpose, scope, user journeys
- [ ] `apps/workspace/requirements.mdx` - Functional and non-functional requirements
- [ ] `apps/workspace/architecture.mdx` - Diagrams and component responsibilities
- [ ] `apps/workspace/config.mdx` - Environment variables, ports, feature flags
- [ ] `apps/workspace/deployment.mdx` - Installation and automation
- [ ] `apps/workspace/operations.mdx` - Health monitoring, logs, metrics
- [ ] `apps/workspace/runbook.mdx` - Incident detection, response, follow-up
- [ ] `apps/workspace/changelog.mdx` - Release history
- [ ] `apps/workspace/api.mdx` - REST endpoints, event streams
- [ ] `apps/workspace/_category_.json` - Sidebar configuration

**TP Capital App** (10 files):
- [ ] `apps/tp-capital/overview.mdx`
- [ ] `apps/tp-capital/requirements.mdx`
- [ ] `apps/tp-capital/architecture.mdx`
- [ ] `apps/tp-capital/config.mdx`
- [ ] `apps/tp-capital/deployment.mdx`
- [ ] `apps/tp-capital/operations.mdx`
- [ ] `apps/tp-capital/runbook.mdx`
- [ ] `apps/tp-capital/changelog.mdx`
- [ ] `apps/tp-capital/api.mdx`
- [ ] `apps/tp-capital/_category_.json`

**Review Focus**:
- Verify deployment procedures are accurate and tested
- Validate environment variables match actual `.env` requirements
- Confirm runbook procedures work (test incident scenarios)
- Check API endpoints match actual implementation
- Verify port numbers match `service-port-map.md`

**Sign-off**:
- [ ] DocsOps Lead: _________________ Date: _______
- [ ] Backend Guild Rep: _________________ Date: _______

---

## Chapter 2: API Documentation (3 files)

**Owner**: ArchitectureGuild
**Reviewer**: Backend Guild
**Timeline**: Week 1 (Oct 24-31)

### Files to Review

- [ ] `api/order-manager.mdx` - Order Manager API summary
- [ ] `api/data-capture.mdx` - Data Capture API summary
- [ ] `api/overview.mdx` - API catalogue (if exists)

**Review Focus**:
- Verify API specifications match planned implementation
- Confirm Redoc TODO markers are accurate
- Validate endpoint naming follows api-styleguide.md
- Check response envelope structure consistency
- Verify performance targets are realistic

**Sign-off**:
- [ ] ArchitectureGuild Lead: _________________ Date: _______
- [ ] Backend Guild Rep: _________________ Date: _______

---

## Chapter 3: SDD Documentation (12 files)

**Owner**: ArchitectureGuild
**Reviewer**: Backend Guild, ProductOps
**Timeline**: Week 1-2 (Oct 24 - Nov 7)

### Files to Review

**Domain Schemas** (3 files):
- [ ] `sdd/domain/schemas/v1/order.mdx` - Order entity definition
- [ ] `sdd/domain/schemas/v1/risk-rule.mdx` - Risk limits configuration
- [ ] `sdd/domain/schemas/v1/index.mdx` - Schema catalogue

**Events** (2 files):
- [ ] `sdd/events/v1/order-created.mdx` - Order creation event
- [ ] `sdd/events/v1/index.mdx` - Event catalogue

**Flows** (2 files):
- [ ] `sdd/flows/v1/place-order.mdx` - Order placement sequence
- [ ] `sdd/flows/v1/cancel-order.mdx` - Order cancellation sequence

**API Specifications** (5 files):
- [ ] `sdd/api/order-manager/v1/spec.mdx` - Detailed API contract
- [ ] `sdd/api/order-manager/v1/guidelines.mdx` - API conventions
- [ ] `sdd/api/order-manager/v1/changelog.mdx` - Design history
- [ ] `sdd/api/data-capture/v1/spec.mdx` (if exists)
- [ ] `sdd/api/data-capture/v1/guidelines.mdx` (if exists)

**Review Focus**:
- Verify TypeScript interfaces match API specifications
- Validate state machine transitions are complete
- Confirm event payloads include all required fields
- Check sequence diagrams accurately represent flows
- Verify validation rules are comprehensive
- Ensure design decisions are documented with rationale

**Sign-off**:
- [ ] ArchitectureGuild Lead: _________________ Date: _______
- [ ] Backend Guild Rep: _________________ Date: _______
- [ ] ProductOps Rep: _________________ Date: _______

---

## Chapter 4: Frontend Documentation (14 files)

**Owner**: FrontendGuild
**Reviewer**: DocsOps, UX Team
**Timeline**: Week 2 (Oct 31 - Nov 7)

### Files to Review

**Design System** (4 files):
- [ ] `frontend/design-system/tokens.mdx` - Design tokens (auto-generated)
- [ ] `frontend/design-system/components.mdx` - UI components catalogue
- [ ] `frontend/design-system/theming.mdx` - Theming strategy
- [ ] `frontend/design-system/patterns.mdx` - Interaction patterns

**Guidelines** (4 files):
- [ ] `frontend/guidelines/style-guide.mdx` - Frontend style guide
- [ ] `frontend/guidelines/accessibility.mdx` - WCAG 2.1 AA guidelines
- [ ] `frontend/guidelines/i18n.mdx` - Internationalization
- [ ] `frontend/guidelines/performance.mdx` - Performance targets

**Engineering** (5 files):
- [ ] `frontend/engineering/architecture.mdx` - Frontend architecture
- [ ] `frontend/engineering/conventions.mdx` - Code conventions
- [ ] `frontend/engineering/lint-format.mdx` - Linting and formatting
- [ ] `frontend/engineering/testing.mdx` - Testing strategy
- [ ] `frontend/engineering/build-ci.mdx` - Build and CI checklist

**Review Focus**:
- Verify generated tokens match tailwind.config.js (run docs:auto)
- Validate component catalogue is current (check dashboard/src/components/)
- Confirm accessibility guidelines are enforced in code
- Check performance targets are measured (bundle size, load time)
- Verify testing strategy matches actual test setup (Vitest, Playwright)

**Sign-off**:
- [ ] FrontendGuild Lead: _________________ Date: _______
- [ ] DocsOps Rep: _________________ Date: _______
- [ ] UX Team Rep: _________________ Date: _______

---

## Chapter 5: Database Documentation (4 files)

**Owner**: DataOps / BackendGuild
**Reviewer**: ArchitectureGuild, DevOps
**Timeline**: Week 2 (Oct 31 - Nov 7)

### Files to Review

- [ ] `database/overview.mdx` - Architecture and data stores
- [ ] `database/schema.mdx` - Table definitions and ER diagrams
- [ ] `database/migrations.mdx` - Migration strategy and plans
- [ ] `database/retention-backup.mdx` - Data lifecycle policies

**Review Focus**:
- Verify schema definitions match actual database tables
- Validate migration procedures are tested
- Confirm backup procedures work (test restore)
- Check retention policies comply with requirements
- Verify QuestDB, TimescaleDB, LowDB documentation is accurate

**Sign-off**:
- [ ] DataOps Lead: _________________ Date: _______
- [ ] BackendGuild Rep: _________________ Date: _______
- [ ] DevOps Rep: _________________ Date: _______

---

## Chapter 6: Tools Documentation (46 files)

**Owner**: ToolingGuild / DocsOps
**Reviewer**: DevOps, Backend Guild
**Timeline**: Week 2-3 (Oct 31 - Nov 14)

### Files to Review (by tool)

**Node.js/npm** (5 files):
- [ ] `tools/node-npm/overview.mdx`, install.mdx, commands.mdx, troubleshooting.mdx, changelog.mdx

**Similar structure for**: dotnet, python, docusaurus, redocusaurus, linting, docker-wsl, plantuml (8 tools × ~5 files each)

**Security Configuration** (5 files):
- [ ] `tools/security-config/overview.mdx` - Security architecture
- [ ] `tools/security-config/env.mdx` - Environment variables reference
- [ ] `tools/security-config/risk-limits.mdx` - Trading risk configuration
- [ ] `tools/security-config/audit.mdx` - Security audit procedures
- [ ] `tools/security-config/_category_.json`

**Ports & Services** (2 files):
- [ ] `tools/ports-services/overview.mdx` - Service port map (auto-generated)
- [ ] `tools/ports-services/_category_.json`

**Review Focus**:
- Verify tool versions match actual usage (Node 20, .NET 8, Python 3.11)
- Validate installation procedures work on clean system
- Confirm commands execute successfully
- Check troubleshooting guides resolve common issues
- Verify generated ports table matches service-port-map.md (run docs:auto)
- Validate security procedures are comprehensive

**Sign-off**:
- [ ] ToolingGuild Lead: _________________ Date: _______
- [ ] DocsOps Rep: _________________ Date: _______
- [ ] DevOps Rep: _________________ Date: _______

---

## Chapter 7: PRD Documentation (6 files)

**Owner**: ProductOps
**Reviewer**: ArchitectureGuild, FrontendGuild
**Timeline**: Week 2 (Oct 31 - Nov 7)

### Files to Review

**Trading App Product**:
- [ ] `prd/products/trading-app/prd-overview.mdx` - Product overview
- [ ] `prd/products/trading-app/feature-order-manager.mdx` - Order Manager feature
- [ ] `prd/products/trading-app/feature-idea-bank.mdx` - Idea Bank feature
- [ ] `prd/products/trading-app/prd-overview.pt.mdx` - Portuguese version
- [ ] `prd/products/trading-app/feature-order-manager.pt.mdx` - Portuguese version
- [ ] `prd/products/trading-app/feature-idea-bank.pt.mdx` - Portuguese version

**Templates**:
- [ ] `prd/templates/prd-template.mdx`
- [ ] `prd/templates/feature-template.mdx`

**Review Focus**:
- Verify PRD content aligns with actual implementation
- Validate user stories match feature capabilities
- Confirm acceptance criteria are measurable
- Check PT/EN translations are synchronized
- Verify dependencies link to correct SDD/API docs
- Validate metrics are tracked in Prometheus/Grafana

**Sign-off**:
- [ ] ProductOps Lead: _________________ Date: _______
- [ ] ArchitectureGuild Rep: _________________ Date: _______
- [ ] FrontendGuild Rep: _________________ Date: _______

---

## Chapter 8: Prompts & Agents (10 files)

**Owner**: PromptOps / MCPGuild
**Reviewer**: BackendGuild, MLOps
**Timeline**: Week 2 (Oct 31 - Nov 7)

### Files to Review

**Prompts** (4 files):
- [ ] `prompts/patterns.mdx` - Prompt patterns and templates
- [ ] `prompts/style-guide.mdx` - Tone and formatting guidelines
- [ ] `prompts/variables.mdx` - Environment variables for LLMs
- [ ] `prompts/overview.mdx` - Prompts overview

**Agents** (6 files):
- [ ] `agents/agno-agents/overview.mdx`, flows.mdx, prompts.mdx, mcp.mdx, tests.mdx, index.mdx

**MCP** (3 files):
- [ ] `mcp/registry.mdx` - MCP server registry (manual, automation blocked)
- [ ] `mcp/transports.mdx`, permissions.mdx

**Review Focus**:
- Verify prompt patterns match actual agent implementations
- Validate LLM configuration variables are documented
- Confirm agent flows are accurate
- Check MCP registry TODO marker is clear
- Verify prompt evaluation criteria are comprehensive

**Sign-off**:
- [ ] PromptOps Lead: _________________ Date: _______
- [ ] MCPGuild Rep: _________________ Date: _______
- [ ] BackendGuild Rep: _________________ Date: _______

---

## Chapter 9: Reference & Templates (13 files)

**Owner**: DocsOps / ArchitectureGuild
**Reviewer**: All Guilds
**Timeline**: Week 3 (Nov 7-14)

### Files to Review

**Templates** (7 files):
- [ ] `reference/templates/page.mdx` - General page template
- [ ] `reference/templates/guide.mdx` - Implementation guide template
- [ ] `reference/templates/runbook.mdx` - Operational runbook template
- [ ] `reference/templates/adr.mdx` - Architecture decision record template
- [ ] `reference/templates/tool.mdx` - Tool documentation template
- [ ] `reference/templates/sdd.mdx` - Software design document template
- [ ] `reference/templates/prd.mdx` - Product requirements template (if exists)

**ADRs** (if migrated):
- [ ] `reference/adrs/ADR-0001.md` - LowDB decision
- [ ] `reference/adrs/ADR-0002.md` - Agno Framework decision
- [ ] `reference/adrs/index.mdx` - ADR catalogue

**Review Focus**:
- Verify templates are comprehensive and usable
- Validate template sections match actual usage
- Confirm ADRs are complete with all sections
- Check templates include examples and guidance

**Sign-off**:
- [ ] DocsOps Lead: _________________ Date: _______
- [ ] ArchitectureGuild Rep: _________________ Date: _______

---

## Chapter 10: Diagrams (1 file + 26 sources)

**Owner**: DocsOps
**Reviewer**: ArchitectureGuild, All Guilds
**Timeline**: Week 3 (Nov 7-14)

### Files to Review

- [ ] `diagrams/diagrams.mdx` - Diagram catalogue and index
- [ ] Verify all 26 .puml files copied to `assets/diagrams/source/`
- [ ] Verify domain-based organization (backend, frontend, ops, agents, adr, shared)

**Review Focus**:
- Confirm all diagrams render correctly in Docusaurus
- Validate diagram metadata table is accurate
- Check PlantUML syntax is valid
- Verify diagrams are up-to-date with current architecture
- Confirm color coding follows design system

**Sign-off**:
- [ ] DocsOps Lead: _________________ Date: _______
- [ ] ArchitectureGuild Rep: _________________ Date: _______

---

## Chapter 11: FAQ & Changelog (2 files)

**Owner**: SupportOps / ReleaseOps
**Reviewer**: DocsOps, All Guilds
**Timeline**: Week 3 (Nov 7-14)

### Files to Review

- [ ] `faq.mdx` - Frequently asked questions
- [ ] `changelog.mdx` - Central changelog index

**Review Focus**:
- Verify FAQ answers are accurate and helpful
- Confirm troubleshooting steps work
- Validate changelog links to component changelogs
- Check release history is complete
- Verify migration history is documented

**Sign-off**:
- [ ] SupportOps Lead: _________________ Date: _______
- [ ] ReleaseOps Lead: _________________ Date: _______
- [ ] DocsOps Rep: _________________ Date: _______

---

## Chapter 12: Root Pages (1 file)

**Owner**: DocsOps
**Reviewer**: ProductOps, All Guilds
**Timeline**: Week 3 (Nov 7-14)

### Files to Review

- [ ] `index.mdx` - Documentation home page

**Review Focus**:
- Verify home page provides clear navigation
- Confirm quick links work
- Validate getting started guide is accurate
- Check search functionality works

**Sign-off**:
- [ ] DocsOps Lead: _________________ Date: _______
- [ ] ProductOps Rep: _________________ Date: _______

---

## Review Process

### Step 1: Self-Review (Owners)

**Timeline**: Week 1-2

**Actions**:
1. Owner reviews all assigned files
2. Fixes obvious issues (typos, broken links, missing sections)
3. Marks files as "Ready for Review" in tracking spreadsheet
4. Documents any blockers or open questions

### Step 2: Peer Review (Reviewers)

**Timeline**: Week 2-3

**Actions**:
1. Reviewer validates content quality and technical accuracy
2. Tests procedures and commands
3. Provides feedback via PR comments or review document
4. Marks files as "Approved" or "Needs Revision"

### Step 3: Final Sign-off (Leads)

**Timeline**: Week 3

**Actions**:
1. Leads review feedback and revisions
2. Sign off on chapter completion
3. Document any deferred items for post-launch
4. Update migration status to "Review Complete"

### Step 4: Launch Readiness (All)

**Timeline**: Week 3 (Nov 14-15)

**Actions**:
1. Run full validation suite (see Validation Execution Guide)
2. Fix any validation failures
3. Final stakeholder approval meeting
4. Go/No-Go decision for launch

---

## Tracking

**Review Spreadsheet**: `docs/governance/review-tracking.csv`

**Columns**:
- File Path
- Owner
- Reviewer
- Status (Not Started, In Review, Needs Revision, Approved)
- Issues Count
- Sign-off Date
- Notes

**Status Dashboard**: Create Grafana dashboard or simple HTML page showing:
- Files reviewed by category (pie chart)
- Review progress by owner (bar chart)
- Issues by severity (table)
- Timeline progress (Gantt chart)

---

## Escalation

**Blockers**:
- If review delayed >3 days: Escalate to DocsOps lead
- If technical disagreement: Escalate to ArchitectureGuild
- If resource constraint: Escalate to project manager

**Communication**:
- Daily standup updates in #docs-migration channel
- Weekly summary email to stakeholders
- Blocker notifications within 24 hours

---

## Success Criteria

**Review Complete When**:
- [ ] All 135 files reviewed and signed off
- [ ] All critical issues resolved (P0, P1)
- [ ] All validation tests pass (docs:check, validate-frontmatter.py)
- [ ] All stakeholders approve launch
- [ ] Communication plan executed

**Metrics**:
- Review completion rate: 100%
- Critical issues resolved: 100%
- Validation pass rate: 100%
- Stakeholder approval: 100%
