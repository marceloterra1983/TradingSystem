---
title: Code ↔ Docs Synchronization System
description: Framework for keeping documentation in lockstep with source code changes using mapping, automation, and CI enforcement.
tags: [governance, automation, documentation]
owner: DocsOps
lastReviewed: 2025-11-03
---

# Code ↔ Docs Synchronization System

## 1. Overview
The synchronization system keeps technical documentation aligned with source code changes. It reduces documentation drift by combining automated detection, actionable reports, and CI enforcement. The solution includes a mapping configuration, an extended `docusaurus-daily` agent, PR automation, and a dedicated validation workflow.

## 2. How It Works

### 2.1 Mapping Configuration
- Location: `governance/CODE-DOCS-MAPPING.json`
- Structure: Source patterns → target docs → severity → owner
- Source types: `backend-api`, `openapi-spec`, `database-schema`, `package-version`, `env-config`, `app-code`
- Uses glob matching to map code files to documentation sections

### 2.2 Detection Mechanism
- `scripts/agents/docusaurus-daily.mjs` loads the mapping
- Analyzes git diffs, matches changed files against patterns, and inspects diffs for trigger keywords
- Detects semantic changes (routes, schema modifications, version bumps, env vars)
- Generates update suggestions grouped by documentation targets with severity metadata

### 2.3 Automation Workflows

**Daily Report Generation**
- Runs via existing scheduling (midnight)
- Output: `docs/content/reports/daily/YYYY-MM-DD.mdx`
- Includes git summary, LLM changelog (optional), and **Documentation Updates Required** section
- Optional PR automation triggered with `--create-pr`

**PR Validation**
- Workflow: `.github/workflows/docs-code-sync-validation.yml`
- Runs on PRs touching backend code, schemas, configs, specs
- Uses agent’s `--check-sync` mode
- Fails on critical violations, warns on high, logs medium/low

## 3. Mapping Configuration Guide

### 3.1 Mapping Structure
```json
{
  "id": "unique-identifier",
  "source": {
    "type": "backend-api | openapi-spec | database-schema | package-version | env-config | app-code",
    "paths": ["glob/pattern/**/*.js"],
    "triggers": ["keyword1", "keyword2"]
  },
  "targets": [
    {
      "path": "docs/content/path/to/file.mdx",
      "sections": ["Section Name"]
    }
  ],
  "severity": "critical | high | medium | low",
  "owner": "TeamName",
  "autoUpdate": false
}
```

### 3.2 Source Types
- **backend-api**: `backend/api/{service}/src/routes/*.js`, triggers include `router.get`, `router.post`, etc.
- **openapi-spec**: `docs/static/specs/*.openapi.yaml`, triggers include `paths:`, `components.schemas`, `info.version`
- **database-schema**: `backend/data/timescaledb/{service}/*.sql`, triggers include `CREATE TABLE`, `ALTER TABLE`, etc.
- **package-version**: `backend/api/{service}/package.json`, `apps/{app}/package.json`, triggers include `"version":`
- **env-config**: `backend/api/{service}/src/config.js`, `.env.example`, triggers include `process.env.`, new default assignments
- **app-code**: `apps/{app}/src/**/*.{js,ts,tsx}`, triggers tailored by app (`PORT`, `feature` keywords)

### 3.3 Severity Levels
- **Critical**: API endpoints, OpenAPI specs, breaking changes → CI failure
- **High**: Database schemas, env vars, configs → CI warning/comment
- **Medium**: Version bumps, non-breaking feature additions → informational checklist
- **Low**: Minor refactors → informational only

### 3.4 Adding New Mappings
1. Edit `governance/CODE-DOCS-MAPPING.json`
2. Add mapping object to `mappings` array
3. Test locally: `node scripts/agents/docusaurus-daily.mjs --check-sync --since "1 day ago"`
4. Commit and push; workflow validates on next PR

## 4. Daily Agent Usage

### 4.1 Command-Line Interface
```bash
# Full report with sync analysis
node scripts/agents/docusaurus-daily.mjs

# Sync check only
node scripts/agents/docusaurus-daily.mjs --check-sync

# Create docs sync PR
node scripts/agents/docusaurus-daily.mjs --create-pr

# Filter by severity
node scripts/agents/docusaurus-daily.mjs --check-sync --severity-threshold high

# Custom since date
node scripts/agents/docusaurus-daily.mjs --since "2025-11-01"

# Dry run sync check
node scripts/agents/docusaurus-daily.mjs --check-sync --dry
```

### 4.2 Outputs
- **Daily report**: git summary + AI changelog + docs checklist
- **Sync validation report**: saved in temp directory, consumed by CI
- **Severity sections**: critical, high, medium/low grouped with owners

## 5. PR Automation

### 5.1 Creating Sync PRs
- Automatic: `node scripts/agents/docusaurus-daily.mjs --create-pr`
- Manual: `bash scripts/docs/create-sync-pr.sh --report-file docs/content/reports/daily/2025-11-03.mdx`

### 5.2 PR Structure
- Branch: `docs/sync-YYYYMMDD-HHMMSS`
- Title: `docs: sync required for code changes YYYY-MM-DD`
- Labels: `documentation`, `sync`, `automated`
- Body: Checklist grouped by severity, owner assignments, validation instructions
- Reviewers: Assigned from mapping owners

### 5.3 Workflow
1. PR created automatically or manually
2. Owners update docs and check items off
3. Run validation scripts before merging
4. Merge when checklist complete and CI green

## 6. CI/CD Validation

### 6.1 Workflow Triggers
- File paths: backend APIs, database schemas, app code, package versions, OpenAPI specs, `.env.example`
- Branches: PRs targeting `main` or `develop`, plus manual dispatch

### 6.2 Validation Process
1. Checkout full repository history
2. Determine changed files vs base branch
3. Run `docusaurus-daily.mjs --check-sync`
4. Collect violations and classify by severity
5. Fail/ warn / log depending on severity
6. Attach report artifact and update PR comment

### 6.3 PR Comment Format
```markdown
## ⚠️ Documentation Sync Required

This PR modifies code that requires documentation updates.

**Violations Found**: 3  
**Critical**: 2

| File | Severity | Target Docs | Owner |
|------|----------|-------------|-------|
| backend/api/workspace/src/routes/items.js | Critical | docs/content/api/workspace-api.mdx | @BackendGuild |

Next steps: update docs, commit changes, re-run validation.
```

### 6.4 Bypassing Validation
- Use `[skip-sync]` in commit message or `sync: skip` label
- Requires lead approval and documented justification in PR

## 7. Best Practices

### 7.1 Developers
- Update docs in the same PR as code changes
- Run `npm run docs:check-sync` pre-review
- Resolve sync violations before requesting review
- Use severity info to prioritize documentation work

### 7.2 Documentation Maintainers
- Review mappings quarterly; add entries for new services
- Track recurring violations for process improvements
- Adjust severity or triggers to tune signal/noise ratio

### 7.3 Team Leads
- Assign owners per mapping and ensure timely responses
- Include sync metrics in retrospectives
- Encourage teams to treat documentation as part of definition of done

## 8. Troubleshooting

### 8.1 False Positives
- Refine triggers or severity in mapping
- Add exclusion patterns
- Document reasoning in PR if temporarily bypassing

### 8.2 Missed Changes
- Add mappings for uncovered files
- Expand glob patterns or keywords
- Review coverage quarterly

### 8.3 CI Failures
- Inspect workflow logs
- Run local check: `node scripts/agents/docusaurus-daily.mjs --check-sync`
- Validate mapping JSON with `npm run docs:validate-mapping`
- Ensure dependencies install correctly

### 8.4 PR Automation Failures
- Confirm `gh` CLI installed and authenticated
- Check branch naming conflicts
- Review GitHub API rate limit status
- Run script with `--dry-run` for diagnostics

## 9. Metrics & Monitoring

### 9.1 Key Metrics
- **Sync compliance rate** = PRs with docs updated ÷ PRs requiring docs
- **Sync PR merge time** = Duration from PR creation to merge
- **Violation rate by severity** = Percentage of PRs causing critical/high violations
- **Mapping coverage** = Percentage of critical code paths mapped

### 9.2 Dashboards
- Planned Grafana panels for compliance, violation breakdown, merge time
- GitHub Insights using `documentation`, `sync` labels and workflow stats

## 10. Related Documentation
- [CODE-DOCS-MAPPING.json](./CODE-DOCS-MAPPING.json)
- [CI-CD-INTEGRATION.md](./CI-CD-INTEGRATION.md)
- [VALIDATION-GUIDE.md](./VALIDATION-GUIDE.md)
- [MAINTENANCE-CHECKLIST.md](./MAINTENANCE-CHECKLIST.md)
- `scripts/agents/docusaurus-daily.mjs`
- `scripts/docs/create-sync-pr.sh`
- `.github/workflows/docs-code-sync-validation.yml`

## 11. Appendix

### 11.1 Command Reference
```bash
# Check sync
npm run docs:check-sync

# Check only critical
npm run docs:check-sync:critical

# Create sync PR
npm run docs:create-sync-pr

# Validate mapping JSON
npm run docs:validate-mapping
```

### 11.2 Mapping Examples
- See `governance/CODE-DOCS-MAPPING.json` for authoritative list.
