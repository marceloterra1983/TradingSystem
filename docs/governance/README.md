# Documentation Governance

This directory contains governance documents for the docs documentation system, including review checklists, maintenance procedures, validation guides, and communication plans.

## Purpose

Governance documents ensure:
- **Quality**: Documentation meets standards through systematic review
- **Freshness**: Content remains current through quarterly maintenance
- **Accountability**: Clear ownership and sign-off processes
- **Sustainability**: Repeatable processes for ongoing maintenance
- **Communication**: Stakeholders informed of changes and launches

## Directory Structure

```
governance/
├── README.md                       # This file
├── DOCUMENTATION-INDEX.md          # Complete documentation index (NEW)
├── REVIEW-CHECKLIST.md             # Review checklist
├── VALIDATION-GUIDE.md             # Validation guide
├── MAINTENANCE-CHECKLIST.md        # Maintenance procedures
├── COMMUNICATION-PLAN.md           # Launch communication plan
├── PLANO-REVISAO-GOVERNANCA.md     # Governance plan (RACI, KPIs, cadência)
├── ENV-AUDIT-REPORT.md            # Environment variables audit
│
├── audits/                         # Quality audits (NEW)
│   ├── APPS-DOCS-AUDIT-2025-10-27.md
│   ├── AUDIT-SUMMARY-2025-10-27.md
│   └── CORRECTIONS-APPLIED-2025-10-27.md
│
├── organization/                   # Organization reports (NEW)
│   ├── APPS-DOCS-ORGANIZATION-2025-10-27.md
│   ├── DOCS-ORGANIZATION-2025-10-27.md
│   └── SCRIPTS-REORGANIZATION-2025-10-27.md
│
├── reviews/                        # Major reviews (NEW)
│   └── DOCUSAURUS-REVIEW-FINAL-REPORT.md
│
└── planning/                       # Planning documents (NEW)
    └── PLANO-REVISAO-API-DOCS.md
```

**Recent Organization (2025-10-29)**: Moved audit, organization, review, and planning documents from project root to organized subdirectories. See [DOCUMENTATION-INDEX.md](DOCUMENTATION-INDEX.md) for complete file locations.

## Documents

### 1. [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md)

**Purpose**: Chapter-by-chapter review checklist for Phase 5 validation

**Audience**: DocsOps, ProductOps, ArchitectureGuild, FrontendGuild, BackendGuild

**Usage**: 
- Review all 135 files before launch
- Organize by owner and category
- Track review progress and sign-offs
- Ensure content quality and technical accuracy

**Timeline**: 3 weeks (Oct 24 - Nov 14, 2025)

---

### 2. [MAINTENANCE-CHECKLIST.md](MAINTENANCE-CHECKLIST.md)

**Purpose**: Quarterly maintenance procedures for ongoing documentation hygiene

**Audience**: DocsOps, Guild Leads

**Usage**:
- Run every 90 days (quarterly)
- Update outdated content (>90 days since last review)
- Validate links and frontmatter
- Track documentation metrics
- Test automation scripts

**Next Review**: Q1 2026 (January 24, 2026)

---

### 3. [VALIDATION-GUIDE.md](VALIDATION-GUIDE.md)

**Purpose**: Step-by-step guide for running the complete validation suite

**Audience**: DocsOps, Release Engineers, QA Team

**Usage**:
- Run before every launch or release
- Execute 8 validation steps (generation, lint, typecheck, test, build, links, frontmatter)
- Create validation report
- Troubleshoot common issues

**Validation Suite**:
1. Content generation (`docs:auto`)
2. Generated content validation (`docs:validate-generated`)
3. Markdown linting (`docs:lint`)
4. TypeScript type checking (`docs:typecheck`)
5. Unit tests (`docs:test`)
6. Build validation (`docs:build`)
7. Link validation (`docs:links`)
8. Frontmatter validation (`validate-frontmatter.py`)

---

### 4. [COMMUNICATION-PLAN.md](COMMUNICATION-PLAN.md)

**Purpose**: Internal communications plan for docs launch

**Audience**: DocsOps, ProductOps, All Team Members

**Usage**:
- Announce launch to team (Slack, email, dashboard)
- Schedule demo and training sessions
- Collect feedback post-launch
- Communicate rollback if needed

**Timeline**:
- T-14 days: Pre-launch announcement
- T-7 days: Demo invitation
- T-1 day: Launch reminder
- Launch day: Go-live announcement
- T+7 days: Feedback survey
- T+30 days: Transition complete

---

### 5. [PLANO-REVISAO-GOVERNANCA.md](PLANO-REVISAO-GOVERNANCA.md)

**Purpose**: Consolidar papéis (RACI), KPIs e cadência trimestral das rotinas de governança.

**Audience**: DocsOps, ProductOps, release/QA, guildas técnicas.

**Usage**:
- Consultar responsabilidades por processo (RACI).
- Seguir ciclo trimestral padronizado (preparação → execução → auditoria → retrospectiva).
- Atualizar `review-tracking.csv` com as colunas `GovernanceStatus`, `LastAuditDate`, `EvidenceLink`.
- Priorizar backlog de melhorias (quick wins e médio prazo).

---

## Governance Workflow

### Phase 5: Review & Governance (Current)

**Week 1** (Oct 24-31):
1. Owners self-review assigned chapters (REVIEW-CHECKLIST.md)
2. Fix obvious issues (typos, broken links)
3. Mark files as "Ready for Review"

**Week 2** (Oct 31 - Nov 7):
1. Reviewers validate content quality
2. Test procedures and commands
3. Provide feedback
4. Mark files as "Approved" or "Needs Revision"

**Week 3** (Nov 7-14):
1. Leads review feedback and revisions
2. Sign off on chapter completion
3. Run full validation suite (VALIDATION-GUIDE.md)
4. Execute communication plan (COMMUNICATION-PLAN.md)
5. Final stakeholder approval
6. Go/No-Go decision

**Week 3** (Nov 14-15):
1. Launch docs (if approved)
2. Monitor for issues
3. Collect feedback

**Week 4** (Nov 15-22):
1. Post-launch monitoring
2. Address feedback and issues
3. Plan Phase 6 (update references, cut-over)

### Ongoing: Quarterly Maintenance

**Every 90 Days**:
1. Run maintenance checklist (MAINTENANCE-CHECKLIST.md)
2. Update outdated content
3. Validate links and frontmatter
4. Track metrics
5. Test automation scripts
6. Plan improvements

**Next Review**: Q1 2026 (January 24, 2026)

---

## Ownership

**Primary Owners**:
- **DocsOps**: Overall documentation quality, governance, automation
- **ProductOps**: PRD content, product requirements
- **ArchitectureGuild**: SDD content, API specs, ADRs
- **FrontendGuild**: Frontend design system, guidelines, engineering
- **BackendGuild**: Backend architecture, database, data schemas
- **ToolingGuild**: Tool documentation, automation scripts

**Supporting Roles**:
- **DataOps**: Database schemas, migrations, backup/retention
- **SecurityOps**: Security configuration, risk limits, audit
- **PromptOps**: Prompt patterns, style guide, variables
- **MCPGuild**: MCP registry, agent documentation
- **SupportOps**: FAQ, troubleshooting guides
- **ReleaseOps**: Changelog, release notes

---

## Metrics & Reporting

**Quarterly Metrics** (tracked in MAINTENANCE-CHECKLIST.md):
- Content health (frontmatter compliance, freshness, link validity)
- Automation health (docs:auto success rate, build time)
- Usage metrics (page views, search queries, user satisfaction)

**Reports Generated**:
- `reports/frontmatter-validation-YYYY-MM-DD.json` - Frontmatter validation results
- `reports/validation-report-YYYY-MM-DD.md` - Full validation report
- `reports/metrics-YYYY-QN.json` - Quarterly metrics
- `reports/review-tracking.csv` - Review progress tracking

**Dashboards**:
- Metrics dashboard (Grafana or HTML) - Content volume, freshness, link health
- Review dashboard - Review progress by category and owner

---

## Related Documentation

**Migration Artifacts**:
- [Migration Report](../migration/INVENTORY-REPORT.md) - Executive summary
- [Migration Mapping](../migration/MIGRATION-MAPPING.md) - Authoritative migration guide
- [Content Inventory](../migration/CONTENT-INVENTORY.md) - Legacy content inventory
- [README Catalog](../migration/README-CATALOG.md) - README file catalog

**Documentation Standards**:
- [Documentation Standard](../content/meta/documentation-standard) (when migrated)
- [Frontmatter Schema](../content/meta/frontmatter-schema) (when created)
- [Style Guide](../content/meta/style-guide) (when migrated)

**Automation**:
- [docs README](../README.md) - Automation and helpers
- [docs-auto.mjs](../../scripts/docs/docs-auto.mjs) - Content generation script
- [validate-frontmatter.py](../../scripts/docs/validate-frontmatter.py) - Frontmatter validation

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-24 | Initial governance framework | DocsOps |
| 1.1.0 | TBD | Post-launch updates | DocsOps |

---

**Questions?** Contact DocsOps or ask in #docs-migration channel.
