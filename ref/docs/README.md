# Documentation & Governance Reference

> **Docusaurus hub and governance system** - Documentation standards and quality
> **Last Updated:** 2025-11-05

## Documentation Hub

**Location:** `docs/`
**Port:** 3404 (NGINX + Docusaurus)
**Technology:** Docusaurus v3 + NGINX
**URL:** http://localhost:3404

### Structure

```
docs/
├── content/              # All documentation content
│   ├── apps/            # Application docs
│   ├── api/             # API specifications
│   ├── frontend/        # UI components, design system
│   ├── database/        # Schemas, migrations
│   ├── tools/           # Development tools
│   ├── sdd/             # Software design documents
│   ├── prd/             # Product requirements
│   ├── reference/       # Templates, ADRs
│   └── diagrams/        # PlantUML diagrams
├── src/                 # Docusaurus source code
├── static/              # Static assets
├── governance/          # Documentation governance
├── docusaurus.config.js # Docusaurus configuration
└── sidebars.js          # Sidebar configuration
```

### Key Features

- ✅ **135+ pages** of comprehensive documentation
- ✅ **Versioning** - Version 1.0.0 frozen
- ✅ **PlantUML** - Architectural diagrams
- ✅ **Redocusaurus** - API documentation (OpenAPI)
- ✅ **MDX** - React components in Markdown
- ✅ **Search** - Built-in search + RAG integration
- ✅ **Dark mode** - Theme switching
- ✅ **Mobile responsive** - Works on all devices

### Content Categories

#### Apps Documentation
- [Workspace](../../docs/content/apps/workspace/) - Item management API
- [TP Capital](../../docs/content/apps/tp-capital/) - Signal ingestion pipeline
- [Order Manager](../../docs/content/apps/order-manager/) - Order execution (planned)
- [Data Capture](../../docs/content/apps/data-capture/) - Market data (planned)

#### API Documentation
- [Overview](../../docs/content/api/overview.mdx) - API catalog
- [Workspace API](../../docs/content/api/workspace.mdx) - REST API spec
- [TP Capital API](../../docs/content/api/tp-capital.mdx) - Webhook API
- **Redocusaurus viewers:**
  - http://localhost:3404/api/workspace - Workspace API
  - http://localhost:3404/api/documentation-api - Documentation API

#### Frontend Documentation
- [Design System](../../docs/content/frontend/design-system/) - Tokens, components
- [Guidelines](../../docs/content/frontend/guidelines/) - Accessibility, i18n
- [Engineering](../../docs/content/frontend/engineering/) - Architecture, testing

#### Database Documentation
- [Overview](../../docs/content/database/overview.mdx) - Architecture
- [Schema](../../docs/content/database/schema.mdx) - Table definitions
- [Migrations](../../docs/content/database/migrations.mdx) - Migration strategy
- [Retention & Backup](../../docs/content/database/retention-backup.mdx) - Data lifecycle

### Frontmatter Requirements

**All MDX files MUST include:**

```yaml
---
title: "Page Title"
tags: [category, topic]
domain: backend|frontend|infrastructure|shared
type: guide|reference|api|tutorial
summary: "Brief description (1-2 sentences)"
status: active|deprecated|archived
last_review: "YYYY-MM-DD"
---
```

**Validation:**
```bash
# Validate all docs
python3 scripts/docs/validate-frontmatter.py --docs-dir ./docs/content

# Generate report
python3 scripts/docs/validate-frontmatter.py --output validation-report.json
```

### Development

```bash
cd docs

# Install dependencies
npm install

# Development server (port 3400)
npm run start -- --port 3400

# Build for production
npm run build

# Serve production build
npm run serve

# Deploy to GitHub Pages
npm run deploy
```

## Governance System

**Location:** `governance/`

The governance system ensures **documentation quality**, **security**, and **compliance** through automated checks and human reviews.

### Structure

```
governance/
├── controls/           # Quality controls
│   ├── VALIDATION-GUIDE.md
│   └── REVIEW-CHECKLIST.md
├── policies/           # Documentation policies
│   ├── quality.md
│   ├── security.md
│   └── retention.md
├── evidence/           # Audit evidence
│   ├── audits/        # Security scans
│   └── reports/       # Quality reports
├── automation/         # Automation scripts
│   ├── scan-secrets.mjs
│   ├── validate-envs.mjs
│   └── validate-policies.mjs
└── registry/           # Documentation registry
    ├── CODE-DOCS-MAPPING.json
    └── templates/
```

### Quality Controls

#### Validation Guide

**Location:** [governance/controls/VALIDATION-GUIDE.md](../../governance/controls/VALIDATION-GUIDE.md)

**Validates:**
- Frontmatter completeness
- Broken links
- Image references
- Code block syntax
- API spec validity
- PlantUML diagrams

**Run validation:**
```bash
# Full validation
npm run validate-docs

# Frontmatter only
npm run validate-docs -- --frontmatter-only

# Links only
npm run validate-docs -- --links-only
```

---

#### Review Checklist

**Location:** [governance/controls/REVIEW-CHECKLIST.md](../../governance/controls/REVIEW-CHECKLIST.md)

**Review criteria:**
- [ ] Accurate and up-to-date
- [ ] Clear and concise
- [ ] Proper formatting (MDX)
- [ ] Code examples work
- [ ] Links are valid
- [ ] Images are optimized
- [ ] Frontmatter complete
- [ ] No sensitive data

---

### Security Automation

#### Secret Scanning

**Script:** `governance/automation/scan-secrets.mjs`

**Detects:**
- API keys
- Passwords
- Tokens
- Private keys
- Connection strings
- Email addresses

**Run scan:**
```bash
node governance/automation/scan-secrets.mjs

# Generate audit report
node governance/automation/scan-secrets.mjs --audit

# Output: governance/evidence/audits/secrets-scan-YYYY-MM-DD.json
```

**Audit report:**
```json
{
  "timestamp": "2025-11-05T10:00:00Z",
  "filesScanned": 1234,
  "issuesFound": 0,
  "criticalIssues": 0,
  "warnings": 5,
  "status": "PASS"
}
```

---

#### Environment Validation

**Script:** `governance/automation/validate-envs.mjs`

**Validates:**
- Required variables present
- Valid formats (URLs, ports)
- No duplicate definitions
- Consistent naming
- Port range compliance (7000-7999 for databases)

**Run validation:**
```bash
node governance/automation/validate-envs.mjs

# Check specific service
node governance/automation/validate-envs.mjs --service workspace
```

---

#### Policy Compliance

**Script:** `governance/automation/validate-policies.mjs`

**Checks compliance with:**
- Documentation quality policy
- Security policy
- Retention policy
- Code review policy

**Run validation:**
```bash
node governance/automation/validate-policies.mjs

# Generate compliance report
node governance/automation/validate-policies.mjs --report
```

---

### Governance Workflows

#### Full Governance Check

**Run all governance automation:**

```bash
# Complete governance check
npm run governance:full

# Includes:
# 1. Policy validation
# 2. Environment validation
# 3. Secret scanning
# 4. Documentation validation
# 5. Metrics generation
```

**Output:**
```
✓ Policies validated
✓ Environments validated
✓ No secrets found
✓ Documentation valid
✓ Metrics generated

Governance check: PASS 🎉
```

---

#### Pre-Deployment Check

**Location:** `scripts/docs/pre-flight-check.sh`

**Run before deploying:**

```bash
bash scripts/docs/pre-flight-check.sh

# CI mode (stricter)
bash scripts/docs/pre-flight-check.sh --ci
```

**Checks:**
- [ ] All docs have valid frontmatter
- [ ] No broken links
- [ ] All images exist
- [ ] API specs valid
- [ ] No exposed secrets
- [ ] Build succeeds
- [ ] Tests pass

---

### Documentation Registry

#### Code-Docs Mapping

**Location:** `governance/registry/CODE-DOCS-MAPPING.json`

**Purpose:** Map code locations to documentation pages

**Example:**
```json
{
  "apps/workspace/server.js": {
    "docs": [
      "docs/content/apps/workspace/overview.mdx",
      "docs/content/api/workspace.mdx"
    ],
    "lastSync": "2025-11-05"
  }
}
```

**Validate mapping:**
```bash
npm run docs:validate-mapping
```

---

#### Documentation Templates

**Location:** `governance/registry/templates/`

**Templates available:**
- `api.template.mdx` - API documentation
- `guide.template.mdx` - User guides
- `reference.template.mdx` - Reference documentation
- `tutorial.template.mdx` - Tutorials
- `adr.template.md` - Architecture Decision Records

**Use template:**
```bash
cp governance/registry/templates/guide.template.mdx docs/content/apps/new-feature.mdx
```

---

### Metrics & Reporting

#### Documentation Metrics

**Script:** `governance/automation/governance-metrics.mjs`

**Generates:**
- Total pages
- Pages by category
- Pages by status
- Outdated pages (last_review > 90 days)
- Missing frontmatter
- Broken links

**Run metrics:**
```bash
node governance/automation/governance-metrics.mjs

# Output: governance/evidence/metrics/YYYY-MM-DD.json
```

**Example metrics:**
```json
{
  "timestamp": "2025-11-05T10:00:00Z",
  "total_pages": 135,
  "by_status": {
    "active": 120,
    "deprecated": 10,
    "archived": 5
  },
  "outdated_pages": 8,
  "quality_score": 92
}
```

---

### Architecture Reviews

**Location:** `governance/evidence/reports/reviews/`

**Latest review:** [architecture-2025-11-01/index.md](../../governance/evidence/reports/reviews/architecture-2025-11-01/index.md)

**Review includes:**
- Architecture assessment
- Code quality analysis
- Security audit
- Performance review
- Technical debt inventory
- Improvement recommendations

**Schedule:** Quarterly (every 3 months)

---

## RAG Integration

### Documentation Search

**The documentation hub integrates with the RAG system for semantic search:**

- **Dashboard interface:** http://localhost:3103/#/llama
- **Direct API:** http://localhost:3405/api/v1/rag/search
- **Collections:** `docs_index_mxbai`

**Features:**
- ✅ Semantic search across all docs
- ✅ Q&A with context
- ✅ Source attribution
- ✅ Confidence scores
- ✅ Auto-reindexing on doc updates

**Query via CLI:**
```bash
bash scripts/rag/query-llamaindex.sh "What is the workspace API?"
```

**Re-index documentation:**
```bash
python3 scripts/rag/ingest-documents.py --docs-dir ./docs/content --force
```

---

## Best Practices

### Documentation Writing

**1. Clear and Concise**
- Use simple language
- Short paragraphs
- Bullet points for lists
- Examples for clarity

**2. Consistent Formatting**
- Follow MDX conventions
- Use proper heading hierarchy (H2 → H3 → H4)
- Code blocks with language tags
- Consistent naming (kebab-case for files)

**3. Maintenance**
- Update `last_review` every 90 days
- Fix broken links immediately
- Archive deprecated content
- Keep examples up-to-date

**4. Security**
- Never commit secrets
- Use placeholders for credentials
- Sanitize sensitive data
- Review changes for exposure

### Architecture Decision Records (ADRs)

**Location:** `docs/content/reference/adrs/`

**Template:** `governance/registry/templates/adr.template.md`

**Format:**
```markdown
# ADR-XXX: Decision Title

**Status:** Accepted|Rejected|Deprecated|Superseded
**Date:** YYYY-MM-DD
**Authors:** @username

## Context
What is the issue we're addressing?

## Decision
What did we decide?

## Consequences
What are the impacts (positive and negative)?

## Alternatives Considered
What other options were evaluated?
```

---

## Additional Resources

- **Docusaurus Docs:** https://docusaurus.io/docs
- **MDX Docs:** https://mdxjs.com/
- **PlantUML Guide:** [docs/content/diagrams/plantuml-guide.mdx](../../docs/content/diagrams/plantuml-guide.mdx)
- **Redocusaurus:** https://redocusaurus.vercel.app/
- **Governance Policies:** [governance/policies/](../../governance/policies/)
