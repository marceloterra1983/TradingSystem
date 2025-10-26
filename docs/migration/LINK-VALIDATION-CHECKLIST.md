---
title: Link Validation Checklist - Phase 6 Final Review
description: Manual and automated link validation checklist for the final Docusaurus migration review.
date: 2025-10-26
author: DocsOps
---

# Link Validation Checklist - Phase 6 Final Review

- **Date:** 2025-10-26  
- **Validator:** DocsOps  
- **Objective:** Ensure every internal and external link works after the final migration updates.

## 1. Automated Link Validation

### 1.1 Docusaurus Link Checker

```bash
cd docs && npm run docs:links
```

- [ ] Build succeeds
- [ ] 0 broken links reported
- [ ] All pages accessible

### 1.2 Markdown Link Checker (Fallback)

```bash
npm install -g markdown-link-check
markdown-link-check README.md
markdown-link-check AGENTS.md
markdown-link-check CLAUDE.md
find docs/content -name "*.mdx" -exec markdown-link-check {} \;
```

- [ ] README.md — all links valid
- [ ] AGENTS.md — all links valid
- [ ] CLAUDE.md — all links valid
- [ ] docs/content/ — sample set valid

## 2. Manual Link Validation

### 2.1 README.md

| Link | Target | Status | Notes |
|------|--------|--------|-------|
| [Documentation Hub](http://localhost:3205) | Docusaurus homepage | [ ] OK / [ ] BROKEN |  |
| [Content Directory](docs/content/) | Local folder | [ ] OK / [ ] BROKEN |  |
| [Validation Guide](docs/governance/VALIDATION-GUIDE.md) | File | [ ] OK / [ ] BROKEN |  |
| [Review Checklist](docs/governance/REVIEW-CHECKLIST.md) | File | [ ] OK / [ ] BROKEN |  |
| [Environment Variables Reference](http://localhost:3205/tools/security-config/env) | Docusaurus page | [ ] OK / [ ] BROKEN |  |
| [Reverse Proxy Setup](http://localhost:3205/tools/infrastructure/reverse-proxy-setup) | Docusaurus page | [ ] OK / [ ] BROKEN |  |

### 2.2 AGENTS.md

- [ ] General text accurate (no broken links)
- [ ] `npm run validate-docs` description matches current script

### 2.3 CLAUDE.md

| Link | Target | Status | Notes |
|------|--------|--------|-------|
| [docs/README.md](docs/README.md) | File | [ ] OK / [ ] BROKEN |  |
| [docs/content/apps/](docs/content/apps/) | Directory | [ ] OK / [ ] BROKEN |  |
| [docs/content/api/](docs/content/api/) | Directory | [ ] OK / [ ] BROKEN |  |
| [docs/governance/VALIDATION-GUIDE.md](docs/governance/VALIDATION-GUIDE.md) | File | [ ] OK / [ ] BROKEN |  |
| http://localhost:3205 | Docusaurus hub | [ ] OK / [ ] BROKEN |  |
| http://localhost:3103 | Dashboard | [ ] OK / [ ] BROKEN |  |

### 2.4 Cross-References in `docs/content/`

| Source | Link | Target | Status | Notes |
|--------|------|--------|--------|-------|
| apps/workspace/overview.mdx | API link | api/workspace.mdx | [ ] OK / [ ] BROKEN |  |
| prd/products/trading-app/prd-overview.mdx | SDD link | sdd/domain/schemas/v1/order.mdx | [ ] OK / [ ] BROKEN |  |
| frontend/design-system/tokens.mdx | Guideline link | frontend/guidelines/style-guide.mdx | [ ] OK / [ ] BROKEN |  |
| reference/templates/adr.mdx | Example link | reference/adrs/ADR-0001.md | [ ] OK / [ ] BROKEN |  |

## 3. Link Pattern Validation

### 3.1 Internal Links

- [ ] No absolute filesystem links (`](/home/` or `](file://`) found
- [ ] No references to `docs/context/`
- [ ] No references to `docs/docusaurus/`

```bash
grep -r "](/home/" docs/content/
grep -r "](file://" docs/content/
grep -r "docs/context" docs/content/ README.md AGENTS.md CLAUDE.md
grep -r "docs/docusaurus" docs/content/ README.md AGENTS.md CLAUDE.md
```

### 3.2 External Links

- [ ] No references to legacy port `3004`

```bash
grep -r "http://localhost:3004" docs/content/ README.md AGENTS.md CLAUDE.md
```

## 4. Asset Validation

### 4.1 Images

- [ ] All referenced images exist

```bash
grep -r "!\[.*\](" docs/content/ | grep -E "\.(png|jpg|jpeg|gif|svg)"
```

### 4.2 Diagrams

- [ ] All PlantUML diagrams referenced exist

```bash
grep -r "plantuml" docs/content/
ls docs/content/assets/diagrams/source/
```

### 4.3 Specifications

- [ ] All OpenAPI / AsyncAPI specs referenced exist

```bash
grep -r "openapi.yaml\\|asyncapi.yaml" docs/content/
ls docs/static/specs/
```

## 5. Browser Testing

### 5.1 Desktop

- [ ] Homepage loads
- [ ] Sidebar navigation works
- [ ] Breadcrumb navigation works
- [ ] Search (Ctrl+K) works
- [ ] Internal links navigate correctly
- [ ] External links open in new tab
- [ ] Redocusaurus pages load

### 5.2 Mobile

- [ ] Hamburger menu opens
- [ ] Sidebar links work
- [ ] Search works
- [ ] Link navigation works

## 6. Summary

- **Automated link validation:** [ ] PASSED / [ ] FAILED
- **Manual link validation:** [ ] PASSED / [ ] FAILED
- **Link patterns:** [ ] PASSED / [ ] FAILED
- **Assets:** [ ] PASSED / [ ] FAILED
- **Browser testing:** [ ] PASSED / [ ] FAILED
- **Broken links detected:** 0

## 7. Sign-off

- [ ] Link validation executed
- [ ] All broken links resolved
- [ ] Approved for commit

