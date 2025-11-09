# 🧭 Governance Navigation Guide

**Last Updated:** 2025-11-08
**Status:** Active
**Version:** 2.0 (Post-Consolidation)

---

## 🚀 Quick Start

### New to Governance?

1. **Start Here**: [README.md](README.md) - Main entry point
2. **Executive Overview**: [GOVERNANCE-SUMMARY.md](GOVERNANCE-SUMMARY.md) - 5-minute read
3. **Detailed Plan**: [GOVERNANCE-ACTION-PLAN.md](GOVERNANCE-ACTION-PLAN.md) - 12-week roadmap
4. **Quick Reference**: [START-HERE.md](START-HERE.md) - Today's tasks

### Looking for Something Specific?

| I need... | Go to... |
|-----------|----------|
| **Policies** | [policies/](policies/) - 4 formal policies |
| **SOPs/Runbooks** | [controls/](controls/) - 4 SOPs + 5 guides |
| **Technical Standards** | [standards/](standards/) - 1 standard |
| **Strategy Plans** | [strategy/](strategy/) - 3 active plans |
| **Audit Reports** | [evidence/audits/](evidence/audits/) - 4 recent audits |
| **Architecture Reviews** | [evidence/reports/reviews/](evidence/reports/reviews/) - 1 main review |
| **Incident Reports** | [evidence/incidents/](evidence/incidents/) - 1 incident |
| **Technical References** | [evidence/references/](evidence/references/) - 2 guides |
| **Historical Docs** | [evidence/archive/](evidence/archive/) - 46 archived files |
| **Artifact Registry** | [registry/registry.json](registry/registry.json) - 19 artifacts |

---

## 📋 Policies (4)

### Active Policies

1. **[POL-0002](policies/secrets-env-policy.md)** - Secrets & Environment Variables Policy
   - Owner: SecurityEngineering
   - Last Reviewed: 2025-11-05
   - Related: STD-010, SOP-SEC-001

2. **[POL-0003](policies/container-infrastructure-policy.md)** - Container Infrastructure & Networking Policy
   - Owner: PlatformEngineering
   - Last Reviewed: 2025-11-05
   - Related: SOP-NET-002

3. **[POL-0004](policies/environment-variables-policy.md)** - Environment Variables Policy
   - Owner: SecurityEngineering
   - Last Reviewed: 2025-11-08
   - Related: POL-0002

4. **[POL-0005](policies/hardcoded-urls-policy.md)** - Hardcoded URLs Prevention Policy
   - Owner: FrontendEngineering
   - Last Reviewed: 2025-11-08
   - Related: POL-0003

### Policy Addendums

- [POL-0002 Addendum 001](policies/addendums/POL-0002-ADDENDUM-001-empty-value-validation.md) - Empty Value Validation
- [POL-0003 Addendum 001](policies/addendums/POL-0003-ADDENDUM-001-port-mapping-rules.md) - Port Mapping Rules

---

## 📏 Standards (1)

1. **[STD-010](standards/secrets-standard.md)** - Technical Standard for Secrets & Environment Variables
   - Owner: SecurityEngineering
   - Last Reviewed: 2025-11-05
   - Implements: POL-0002

---

## ⚙️ Controls (9)

### SOPs (4)

1. **[SOP-SEC-001](controls/secrets-rotation-sop.md)** - Secrets Rotation SOP
   - Owner: SecurityEngineering
   - Last Reviewed: 2025-11-05
   - Implements: POL-0002, STD-010

2. **[SOP-NET-002](controls/TP-CAPITAL-NETWORK-VALIDATION.md)** - TP Capital Network Validation
   - Owner: DevOps
   - Last Reviewed: 2025-11-05
   - Implements: POL-0003

3. **[SOP-DOCS-001](controls/docusaurus-deployment-sop.md)** - Docusaurus Deployment SOP
   - Owner: DocsOps
   - Last Reviewed: 2025-11-05

4. **[SOP-DOCS-002](controls/governance-json-sanitization-sop.md)** - Governance JSON Sanitization SOP
   - Owner: DocsOps
   - Last Reviewed: 2025-11-05

### Operational Guides (5)

1. **[VALIDATION-GUIDE.md](controls/VALIDATION-GUIDE.md)** - Validation suite and quality standards
2. **[REVIEW-CHECKLIST.md](controls/REVIEW-CHECKLIST.md)** - Review process and criteria
3. **[PRE-DEPLOY-CHECKLIST.md](controls/PRE-DEPLOY-CHECKLIST.md)** - Pre-deployment validation
4. **[MAINTENANCE-CHECKLIST.md](controls/MAINTENANCE-CHECKLIST.md)** - Regular maintenance tasks
5. **[MAINTENANCE-AUTOMATION-GUIDE.md](controls/MAINTENANCE-AUTOMATION-GUIDE.md)** - Automation reference

---

## 🎯 Strategy (3)

### Active Plans

1. **[TECHNICAL-DEBT-TRACKER.md](strategy/TECHNICAL-DEBT-TRACKER.md)**
   - Owner: Architecture
   - Last Reviewed: 2025-11-01
   - Tracks: Technical debt with prioritization and remediation plans

2. **[CI-CD-INTEGRATION.md](strategy/CI-CD-INTEGRATION.md)**
   - Owner: DevOps
   - Roadmap: CI/CD pipeline integration and automation

3. **[COMMUNICATION-PLAN.md](strategy/COMMUNICATION-PLAN.md)**
   - Owner: Governance
   - Stakeholder communication and update strategy

---

## 📊 Evidence

### Audits (4 Active)

1. **[secrets-security-audit-2025-11-07.md](evidence/audits/secrets-security-audit-2025-11-07.md)**
   - Latest secrets audit with scan results
   - Related: secrets-scan-2025-11-07.json

2. **[tp-capital-network-2025-11-05.json](evidence/audits/tp-capital-network-2025-11-05.json)**
   - Network validation data from incident

3. **[incident-2025-11-05.json](evidence/audits/incident-2025-11-05.json)**
   - Incident metadata and timeline

### Incidents (1)

1. **[2025-11-05-tp-capital-connectivity-failure.md](evidence/incidents/2025-11-05-tp-capital-connectivity-failure.md)**
   - Root cause analysis and prevention measures

### Metrics (1)

1. **[METRICS-DASHBOARD.md](evidence/metrics/METRICS-DASHBOARD.md)**
   - Documentation health metrics and trends

### Reports (3 + 1 Review Directory)

1. **[governance-improvement-plan-2025-11-08.md](evidence/reports/governance-improvement-plan-2025-11-08.md)**
   - Comprehensive 35-page governance analysis
   - Score: B+ (85/100) → Target: A (95/100)

2. **[DOCUMENTATION-INDEX.md](evidence/reports/DOCUMENTATION-INDEX.md)**
   - Documentation structure and navigation

3. **[MAINTENANCE-SYSTEM-SUMMARY.md](evidence/reports/MAINTENANCE-SYSTEM-SUMMARY.md)**
   - Maintenance automation overview

4. **[reviews/architecture-2025-11-01/](evidence/reports/reviews/architecture-2025-11-01/)**
   - Main architecture review (8 files)
   - Score: B+ (85/100)
   - Comprehensive analysis with recommendations

### References (2)

1. **[code-docs-sync.md](evidence/references/code-docs-sync.md)**
   - Code-documentation synchronization guide

2. **[link-migration.md](evidence/references/link-migration.md)**
   - Link migration reference and patterns

### Archive (46 Files)

Browse archived historical documents:

- **[root-docs/](evidence/archive/root-docs/)** - 9 implementation docs
- **[audits/](evidence/archive/audits/)** - 9 old audits
- **[reviews/](evidence/archive/reviews/)** - 19 obsolete reviews
- **[organization/](evidence/archive/organization/)** - 4 completed projects
- **[strategy/](evidence/archive/strategy/)** - 5 completed plans

---

## 📁 Registry

**[registry.json](registry/registry.json)** - Central artifact registry

- Version: 2
- Total Artifacts: 19
- Last Cleanup: 2025-11-08
- [Schema](registry/schemas/registry.schema.json)
- [Templates](registry/templates/)

---

## 🤖 Automation

**[automation/](automation/)**

- package.json - NPM dependencies (ajv, yaml, date-fns, etc.)
- Scripts ready for Week 1 implementation

---

## 📚 Consolidation History

### Recent Changes (2025-11-08)

1. **Registry Cleanup**
   - Reduced artifacts: 71 → 15 (-79%)
   - Report: See registry change log

2. **Structure Consolidation**
   - Reduced active files: 86 → 40 (-54%)
   - Archived: 46 files
   - Reports:
     - [GOVERNANCE-CLEANUP-REPORT-2025-11-08.md](GOVERNANCE-CLEANUP-REPORT-2025-11-08.md)
     - [CONSOLIDATION-SUMMARY-2025-11-08.md](CONSOLIDATION-SUMMARY-2025-11-08.md)

---

## 🔍 Finding What You Need

### By Use Case

**I want to...**

| Task | Resource |
|------|----------|
| Understand governance score | [GOVERNANCE-SUMMARY.md](GOVERNANCE-SUMMARY.md) |
| See 12-week plan | [GOVERNANCE-ACTION-PLAN.md](GOVERNANCE-ACTION-PLAN.md) |
| Implement Week 1 tasks | [START-HERE.md](START-HERE.md) |
| Rotate a secret | [SOP-SEC-001](controls/secrets-rotation-sop.md) |
| Deploy Docusaurus | [SOP-DOCS-001](controls/docusaurus-deployment-sop.md) |
| Validate TP Capital network | [SOP-NET-002](controls/TP-CAPITAL-NETWORK-VALIDATION.md) |
| Review architecture decisions | [architecture-2025-11-01/](evidence/reports/reviews/architecture-2025-11-01/) |
| Check technical debt | [TECHNICAL-DEBT-TRACKER.md](strategy/TECHNICAL-DEBT-TRACKER.md) |
| Find historical docs | [evidence/archive/](evidence/archive/) |

### By Owner

| Owner | Artifacts |
|-------|-----------|
| **SecurityEngineering** | POL-0002, POL-0004, STD-010, SOP-SEC-001 |
| **PlatformEngineering** | POL-0003 |
| **FrontendEngineering** | POL-0005 |
| **DevOps** | SOP-NET-002, CI-CD Integration |
| **DocsOps** | SOP-DOCS-001, SOP-DOCS-002, Guides |
| **Architecture** | Technical Debt Tracker, Reviews |
| **Governance** | Summary, Action Plan, Communication |

---

## 🎯 Next Steps

### This Week (Week 0)

- [x] Review consolidation results
- [ ] Commit changes
- [ ] Update README.md

### Week 1 (Starting 11/11)

- [ ] Kickoff meeting (Monday 9am)
- [ ] ADR Framework implementation
- [ ] Policy validation automation
- [ ] Metrics dashboard setup

**See:** [START-HERE.md](START-HERE.md) for detailed Week 1 tasks

---

## 📞 Need Help?

- **General Questions**: Check [README.md](README.md) or [GOVERNANCE-INDEX.md](GOVERNANCE-INDEX.md)
- **Week 1 Tasks**: See [START-HERE.md](START-HERE.md)
- **Implementation Details**: See [GOVERNANCE-ACTION-PLAN.md](GOVERNANCE-ACTION-PLAN.md)
- **Consolidation Info**: See [CONSOLIDATION-SUMMARY-2025-11-08.md](CONSOLIDATION-SUMMARY-2025-11-08.md)

---

**Last Updated:** 2025-11-08
**Maintained By:** Governance Team
**Version:** 2.0 (Post-Consolidation)
