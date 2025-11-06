# Documentation Maintenance Checklist

**Purpose**: Ensure documentation remains accurate, current, and high-quality through quarterly hygiene reviews.

**Frequency**: Quarterly (every 90 days)
**Owner**: DocsOps
**Next Review**: 2026-01-24 (Q1 2026)
**Last Maintenance Run**: 2025-10-29 — Docs hub cutover to ports `3400/3401` and validation thresholds recalibrated.

## Metrics & Evidence

- **KPI**: `%Freshness = arquivos com lastReviewed < 90 dias / total de arquivos monitorados` (meta 100% ou plano de ação registrado).
- **Registro**: Salvar o relatório gerado em `docs/reports/frontmatter-validation-YYYYMMDD.json` e registrar no `review-tracking.csv` (`LastAuditDate`, `EvidenceLink`).
- **Evidência adicional**: Para itens que entraram em ação corretiva, abrir issue ou checklist e apontar o link no campo `EvidenceLink`.
- **Follow-up**: Indicar no final deste arquivo os percentuais obtidos e principais ajustes planejados.

## Quarterly Review Checklist

### Week 1: Content Freshness Review

**Objective**: Identify and update outdated documentation.

#### Step 1: Run Freshness Analysis

**Command**:
```bash
# Scan docs for outdated content (>90 days)
python scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation-$(date +%Y%m%d).json \
  --threshold-days 90 \
  --verbose
```

**Expected Output**: JSON report with outdated documents list

**Actions**:
- [ ] Review outdated documents list (>90 days since lastReviewed)
- [ ] Prioritize by domain (Critical: apps, api, database; High: frontend, tools; Medium: reference, prompts)
- [ ] Assign owners for content review
- [ ] Schedule review sessions (1 week)

#### Step 2: Update Content

**For Each Outdated Document**:
- [ ] Review content for accuracy (verify against current code/config)
- [ ] Update examples and commands (test all code blocks)
- [ ] Fix broken links (internal and external)
- [ ] Update screenshots/diagrams if UI changed
- [ ] Update frontmatter `lastReviewed` to current date
- [ ] Commit changes with message: `docs: quarterly review - <file-name>`

**Bulk Update Command** (for files with no content changes):
```bash
# Update lastReviewed date for reviewed files
# (Manual edit or script to update frontmatter)
```

#### Step 3: Archive Deprecated Content

**Actions**:
- [ ] Identify deprecated features/tools (status: deprecated in frontmatter)
- [ ] Move to `content/archive/YYYY-QN/` directory
- [ ] Update frontmatter with `archived_date` and `archive_reason`
- [ ] Add redirect from old path to archive notice
- [ ] Update navigation (remove from sidebars)

---

### Week 2: Link Validation & Repair

**Objective**: Ensure all links are valid and up-to-date.

#### Step 1: Run Link Validator

**Command**:
```bash
# Build site and validate all links
cd docs
npm run docs:links
```

**Expected Output**: Report of broken links (internal and external)

**Actions**:
- [ ] Review broken links report
- [ ] Categorize by severity:
  - **Critical**: Links in getting started guides, API docs
  - **High**: Links in feature docs, runbooks
  - **Medium**: Links in reference docs, templates
  - **Low**: Links in archived content

#### Step 2: Fix Broken Links

**For Each Broken Link**:
- [ ] Determine if target moved (update link)
- [ ] Determine if target deleted (remove link or add archive notice)
- [ ] Determine if external link dead (find replacement or remove)
- [ ] Test fix (re-run link validator)
- [ ] Commit changes

**Bulk Link Update** (if many links to same target):
```bash
# Use find/replace across all files
grep -r "old-path" docs/content/ | cut -d: -f1 | sort -u
# Then manually update or use sed
```

#### Step 3: Validate Cross-References

**Actions**:
- [ ] Check PRD → SDD links (ensure features link to specs)
- [ ] Check SDD → API links (ensure specs link to endpoints)
- [ ] Check API → App links (ensure APIs link to app docs)
- [ ] Check Guide → Runbook links (ensure guides reference operational procedures)
- [ ] Update any stale cross-references

---

### Week 3: Frontmatter Compliance & Metrics

**Objective**: Ensure frontmatter quality and track documentation metrics.

#### Step 1: Validate Frontmatter

**Command**:
```bash
# Run frontmatter validation for docs schema
python3 scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation-$(date +%Y%m%d).json \
  --threshold-days 90
```

**Note**: The validator enforces the docs schema with required fields (`title`, `description`, `tags`, `owner`, `lastReviewed`) and restricts owners to DocsOps, ProductOps, ArchitectureGuild, FrontendGuild, BackendGuild, ToolingGuild, DataOps, SecurityOps, PromptOps, MCPGuild, SupportOps, ReleaseOps.

**Actions**:
- [ ] Review validation report
- [ ] Fix missing required fields
- [ ] Correct invalid field values
- [ ] Update owner assignments if changed
- [ ] Ensure all dates are current

#### Schema Migration Completed 2025-11-03

- Legacy fields (`domain`, `type`, `status`, `summary`, `last_review`, `sidebar_position`) removed from 215 documents.
- V2 schema enforced across the repository with `title`, `description`, `tags`, `owner`, `lastReviewed`.
- Ownership values normalized to the approved guild list; see `docs/reports/invalid-owners-2025-11-03.txt` for historical context.
- Detailed activity captured in `docs/reports/cleanup-audit-2025-11-03.md`.
- Future audits should treat any reintroduction of legacy fields as critical regressions.

#### Step 2: Track Documentation Metrics

**Metrics to Collect**:

**Volume Metrics**:
- Total files by category (apps, api, frontend, tools, etc.)
- Files by owner (DocsOps, ProductOps, etc.)
- Files by review window (under 30, 31-90, over 90 days)
- Average file size (lines, words)

**Quality Metrics**:
- Frontmatter compliance rate (% with all required fields)
- Link validity rate (% of links working)
- Content freshness (% reviewed within 90 days)
- Placeholder rate (% of files with TODO/TBD markers)

**Usage Metrics** (if analytics available):
- Page views by category
- Search queries
- Most visited pages
- Bounce rate

**Collection Method**:
```bash
# Count files by category
find docs/content -name "*.mdx" | grep -E "^docs/content/([^/]+)" | cut -d/ -f3 | sort | uniq -c

# Count files by owner (requires parsing frontmatter)
grep -r "^owner:" docs/content/ | cut -d: -f3 | sort | uniq -c

# Count TODO markers
grep -r "TODO\|TBD\|FIXME" docs/content/ | wc -l
```

**Actions**:
- [ ] Collect metrics and save to `docs/reports/metrics-YYYY-QN.json`
- [ ] Compare with previous quarter (identify trends)
- [ ] Create metrics dashboard (Grafana or simple HTML)
- [ ] Share metrics with stakeholders

#### Step 3: Update Metrics Dashboard

**Dashboard Panels**:
1. **Content Volume**: Total files by category (bar chart)
2. **Content Freshness**: % reviewed within 90 days (gauge)
3. **Link Health**: % of links working (gauge)
4. **Frontmatter Compliance**: % with all required fields (gauge)
5. **Ownership Distribution**: Files by owner (pie chart)
6. **Quarterly Trends**: Metrics over time (line chart)

**Dashboard Location**: `http://localhost:3400/dashboard/` (standalone), `http://localhost:3103/documentation/metrics` (React), `http://localhost:3000/d/docs-health` (Grafana)

**Access Dashboards**:
- **Standalone HTML**: Start docs site (`npm run docs:dev`), open `http://localhost:3400/dashboard/`
- **React Dashboard**: Start dashboard app (`cd frontend/dashboard && npm run dev`), navigate to Documentation → Metrics
- **Grafana**: Ensure Grafana is running, open `http://localhost:3000/d/docs-health/documentation-health-dashboard`

**Update Metrics**:
```bash
# Generate latest reports
bash scripts/docs/maintenance-audit.sh

# Build metrics JSON
cd docs
npm run docs:metrics
```

---

### Week 4: Automation, Versioning & Tooling Review

**Objective**: Ensure automation scripts work correctly, manage documentation versions, and maintain build performance.

#### Step 1: Version Health Check

**Purpose**: Monitor active versions, build performance, and storage usage.

**Actions**:
- [ ] List all active versions:
  ```bash
  cd docs
  npm run docs:version:list
  ```

- [ ] Check version count (target: current + 2 stable = 3 max):
  ```bash
  cat versions.json | jq length
  ```

- [ ] Measure build performance:
  ```bash
  time npm run docs:build
  # Target: < 120s with 3 versions
  ```

- [ ] Check storage usage per version:
  ```bash
  du -sh versioned_docs/version-*/
  # Target: < 10MB per version
  ```

- [ ] Review version deprecation candidates (> 2 releases old):
  - If `2.0.0` is stable and `1.0.0` exists → Consider deprecating `1.0.0`
  - Add deprecation notice (12 months before removal)
  - See `VERSIONING-GUIDE.md` for deprecation procedures

#### Step 2: Version Link Validation

**Actions**:
- [ ] Run link validation on all versions:
  ```bash
  npm run docs:links 2>&1 | tee version-links-report.txt
  ```

- [ ] Check broken links per version:
  ```bash
  for VERSION in $(cat versions.json | jq -r '.[]'); do
    echo "=== Version $VERSION ==="
    grep "version-$VERSION" version-links-report.txt | grep "Broken" | wc -l
  done
  ```

- [ ] Document known issues (external links broken in old versions):
  - Create `governance/KNOWN-ISSUES.md` if not exists
  - List acceptable broken links per version

#### Step 3: Test Automation Scripts

**Scripts to Test**:

**docs:auto** (content generation):
```bash
cd docs
npm run docs:auto
npm run docs:validate-generated
```
- [ ] Verify ports table generated correctly
- [ ] Verify design tokens extracted correctly
- [ ] Verify MCP registry TODO marker present
- [ ] Check generation timestamps are current
- [ ] Validate no manual edits overwritten

**docs:check** (full validation pipeline):
```bash
cd docs
npm run docs:check
```
- [ ] Verify all steps complete successfully (auto, validate, lint, typecheck, test, build)
- [ ] Check build output for warnings/errors
- [ ] Validate build time is acceptable (< 120s with versions)

**docs:links** (link validation):
```bash
cd docs
npm run docs:links
```
- [ ] Verify linkinator runs successfully
- [ ] Check for broken links (< 5 per version)
- [ ] Validate external links (if any)

**validate-frontmatter.py** (frontmatter validation):
```bash
python scripts/docs/validate-frontmatter.py \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-validation.json
```
- [ ] Verify script supports docs schema (update if needed)
- [ ] Check validation rules are current
- [ ] Validate report format is useful

#### Step 2: Review Husky Hooks

**Actions**:
- [ ] Test pre-commit hook (stage docs change, commit)
- [ ] Verify docs:auto runs before lint
- [ ] Test pre-push hook (push to test branch)
- [ ] Verify docs:check runs successfully
- [ ] Check hook performance (should complete in under 30 seconds)
- [ ] Validate SKIP_DOCS_HOOKS bypass works

#### Step 3: Update Automation Scripts

**Actions**:
- [ ] Review docs-auto.mjs for optimization opportunities
- [ ] Update generator logic if source formats changed
- [ ] Add new generators if needed (env vars table, OpenAPI specs)
- [ ] Update tests for any script changes
- [ ] Document any new automation in README

---

## Annual Review (Yearly)

**Objective**: Major documentation audit and strategic planning.

**Timeline**: January (Q1)

### Content Audit

- [ ] Review all 135+ files for accuracy
- [ ] Archive deprecated content (>1 year old)
- [ ] Identify documentation gaps (new features, tools)
- [ ] Plan documentation roadmap for year
- [ ] Update documentation standards if needed

### Technology Review

- [ ] Review Docusaurus version (upgrade if needed)
- [ ] Review plugin versions (PlantUML, Redocusaurus, Mermaid)
- [ ] Review validation tools (markdownlint, linkinator)
- [ ] Update dependencies (npm audit, security patches)

### Process Review

- [ ] Review quarterly checklist effectiveness
- [ ] Update review criteria if needed
- [ ] Gather feedback from documentation users
- [ ] Identify process improvements
- [ ] Update governance documents

---

## Metrics Tracking

**Quarterly Metrics to Track**:

### Content Health

| Metric | Target | Q4 2025 | Q1 2026 | Q2 2026 | Q3 2026 |
|--------|--------|---------|---------|---------|----------|
| Frontmatter compliance | 100% | - | - | - | - |
| Content freshness (under 90 days) | over 80% | - | - | - | - |
| Link validity | over 95% | - | - | - | - |
| Placeholder rate | under 5% | - | - | - | - |
| Files with TODO markers | under 10 | - | - | - | - |

### Automation Health

| Metric | Target | Q4 2025 | Q1 2026 | Q2 2026 | Q3 2026 |
|--------|--------|---------|---------|---------|----------|
| docs:auto success rate | 100% | - | - | - | - |
| docs:check pass rate | 100% | - | - | - | - |
| Build time (seconds) | under 120 | - | - | - | - |
| Test coverage | over 80% | - | - | - | - |

### Version Health

| Metric | Target | Q4 2025 | Q1 2026 | Q2 2026 | Q3 2026 |
|--------|--------|---------|---------|---------|----------|
| Active versions count | ≤3 | - | - | - | - |
| Storage per version (MB) | under 10 | - | - | - | - |
| Build time with versions (s) | under 120 | - | - | - | - |
| Broken links per version | under 5 | - | - | - | - |

### Usage Metrics (if analytics available)

| Metric | Target | Q4 2025 | Q1 2026 | Q2 2026 | Q3 2026 |
|--------|--------|---------|---------|---------|----------|
| Monthly page views | - | - | - | - | - |
| Avg. session duration | >2 min | - | - | - | - |
| Search success rate | >70% | - | - | - | - |
| User satisfaction | >4/5 | - | - | - | - |

---

## Continuous Improvement

**Feedback Collection**:
- [ ] Add feedback widget to documentation pages
- [ ] Monitor #docs-feedback Slack channel
- [ ] Review GitHub issues tagged "documentation"
- [ ] Conduct quarterly user survey

**Action Items**:
- [ ] Prioritize feedback by impact and effort
- [ ] Create improvement backlog
- [ ] Assign owners for improvements
- [ ] Track completion in quarterly reviews

---

## Checklist Maintenance

**This Checklist Should Be**:
- [ ] Reviewed annually (January)
- [ ] Updated when processes change
- [ ] Versioned in Git (track changes)
- [ ] Shared with all documentation contributors

**Version History**:

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-24 | Initial version | DocsOps |
| 1.1.0 | TBD | Updated for docs schema | DocsOps |
| 1.2.0 | 2025-10-28 | Added versioning health checks | DocsOps |

---

## Related Documentation

- [Review Checklist](./REVIEW-CHECKLIST.md) - Chapter-by-chapter review
- [Versioning Guide](./VERSIONING-GUIDE.md) - Version management procedures
- [Validation Guide](./VALIDATION-GUIDE.md) - How to run validation suite (includes version validation)
- [Metrics Dashboard Guide](./METRICS-DASHBOARD.md) - Dashboard usage and metrics explanation
- [Communication Plan](./COMMUNICATION-PLAN.md) - Internal announcements
