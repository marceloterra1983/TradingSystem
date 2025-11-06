---
title: "Docusaurus Quick Commands"
description: "Frequently used npm scripts and helpers for the documentation workspace."
tags:
  - tools
  - docusaurus
  - scripts
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Quick Commands Reference - Docusaurus

**Last Updated**: 2025-11-02  
**Purpose**: Fast reference for common Docusaurus operations

---

## 🚀 Daily Operations

### Start Development Server

```bash
cd /home/marce/Projetos/TradingSystem/docs
npm run docs:dev

# Access: http://localhost:3400
```

---

### Build for Production

```bash
cd /home/marce/Projetos/TradingSystem/docs
npm run docs:build

# Output: build/ directory (797 pages)
```

---

### Serve Built Site Locally

```bash
cd /home/marce/Projetos/TradingSystem/docs
npm run docs:serve

# Access: http://localhost:3400
```

---

## 🔍 Validation Commands

### Full Validation Suite

```bash
cd /home/marce/Projetos/TradingSystem/docs
npm run docs:check

# Runs: auto, validate-generated, lint, typecheck, test, build
```

---

### Individual Validations

```bash
# Content generation
npm run docs:auto

# Markdown linting
npm run docs:lint

# TypeScript checking
npm run docs:typecheck

# Unit tests
npm run docs:test

# Build test
npm run docs:build

# Link validation (requires build first)
npm run docs:links
```

---

### Frontmatter Validation

```bash
cd /home/marce/Projetos/TradingSystem

python3 scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-$(date +%Y%m%d).json

# View results
cat docs/reports/frontmatter-$(date +%Y%m%d).json | jq '.summary'
```

---

## 🔧 Maintenance Commands

### Clean Build Cache

```bash
cd /home/marce/Projetos/TradingSystem/docs

rm -rf .docusaurus build

npm run docs:build
```

---

### Update Dependencies

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Check outdated
npm outdated

# Update (careful with major versions)
npm update

# Rebuild and test
npm run docs:build
```

---

### Find Orphaned Files

```bash
cd /home/marce/Projetos/TradingSystem/docs/content

# Find test files
find . -name "*test*.md" -o -name "*orfao*.md"

# Find files without frontmatter
grep -L "^---" *.{md,mdx} 2>/dev/null
```

---

## 📊 Health Check

### Quick Health Check

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Build test
npm run docs:build > /dev/null 2>&1 && \
  echo "✅ Build OK" || echo "❌ Build FAILED"

# Count pages
find build -name "*.html" | wc -l

# Check frontmatter
python3 ../scripts/docs/validate-frontmatter.py --schema v2 \
  --docs-dir ./content 2>&1 | tail -5
```

---

### Full Health Script

```bash
#!/bin/bash
# /home/marce/Projetos/TradingSystem/docs/health-check.sh

cd /home/marce/Projetos/TradingSystem/docs

echo "=== Docusaurus Health Check ==="
echo ""

# 1. Dependencies
echo "[1/6] Checking dependencies..."
npm list --depth=0 > /dev/null 2>&1 && \
  echo "✅ Dependencies OK" || echo "⚠️  Dependency issues"

# 2. Build
echo "[2/6] Testing build..."
npm run docs:build > /dev/null 2>&1 && \
  echo "✅ Build succeeds" || echo "❌ Build fails"

# 3. Page count
echo "[3/6] Counting pages..."
PAGE_COUNT=$(find build -name "*.html" 2>/dev/null | wc -l)
echo "📄 Pages: $PAGE_COUNT"

# 4. Frontmatter
echo "[4/6] Validating frontmatter..."
python3 ../scripts/docs/validate-frontmatter.py \
  --schema v2 --docs-dir ./content > /dev/null 2>&1 && \
  echo "✅ Frontmatter OK" || echo "⚠️  Frontmatter issues"

# 5. Orphaned files
echo "[5/6] Checking for orphaned files..."
ORPHANS=$(find content -name "*test*.md" -o -name "*orfao*.md" 2>/dev/null | wc -l)
[ "$ORPHANS" -eq 0 ] && \
  echo "✅ No orphaned files" || echo "⚠️  Found $ORPHANS orphaned files"

# 6. Build size
echo "[6/6] Build size..."
du -sh build 2>/dev/null || echo "⚠️  Build directory missing"

echo ""
echo "=== Health Check Complete ==="
```

**Usage**:
```bash
bash /home/marce/Projetos/TradingSystem/docs/health-check.sh
```

---

## 🐛 Troubleshooting

### Build Fails

```bash
# Clear cache
rm -rf .docusaurus build

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try build again
npm run docs:build
```

---

### Links Broken

```bash
# Find broken links
npm run docs:build 2>&1 | grep "WARNING.*broken"

# Common causes:
# - File moved/deleted
# - Wrong path
# - Missing file

# Fix and rebuild
npm run docs:build
```

---

### Frontmatter Issues

```bash
# Validate and get details
python3 ../scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./content \
  --output ./reports/validation.json

# View issues
cat reports/validation.json | jq '.results[] | select(.issues != [])'
```

---

## 📦 Docker Commands

### Using Docker Compose

```bash
cd /home/marce/Projetos/TradingSystem

# Start docs container
docker compose -f tools/compose/docker-compose.docs.yml up -d

# View logs
docker logs docs-hub

# Restart
docker compose -f tools/compose/docker-compose.docs.yml restart

# Stop
docker compose -f tools/compose/docker-compose.docs.yml down
```

---

### Build Inside Container

```bash
# Run build in container
docker run --rm \
  -v $(pwd)/docs:/docs \
  -w /docs \
  node:18 \
  npm run docs:build

# Output: docs/build/
```

---

## 🔐 Production Commands

### Pre-Deploy Checklist

```bash
# 1. Full validation
cd docs && npm run docs:check

# 2. Build
npm run docs:build

# 3. Size check
du -sh build/

# 4. Link validation
npm run docs:links

# 5. Frontmatter
cd .. && python3 scripts/docs/validate-frontmatter.py --schema v2
```

---

### Deploy to NGINX

```bash
# Backup current
sudo cp -r /var/www/tradingsystem-docs \
           /var/www/tradingsystem-docs-backup-$(date +%Y%m%d)

# Deploy new build
sudo cp -r build/* /var/www/tradingsystem-docs/

# Set permissions
sudo chown -R www-data:www-data /var/www/tradingsystem-docs/

# Reload NGINX
sudo systemctl reload nginx

# Verify
curl -I https://docs.tradingsystem.example.com
```

---

### Rollback

```bash
# Restore backup
sudo cp -r /var/www/tradingsystem-docs-backup-YYYYMMDD/* \
           /var/www/tradingsystem-docs/

# Reload
sudo systemctl reload nginx
```

---

## 🎯 Search Commands (After Algolia Setup)

### Test Search Locally

```bash
# Build with search
npm run docs:build

# Serve
npm run docs:serve

# Visit http://localhost:3400
# Press Ctrl+K to test search
```

---

### Verify Search Config

```bash
# Check Algolia config in config file
cat docusaurus.config.js | grep -A 10 "algolia:"

# Test search API directly (if credentials available)
curl -X GET \
  "https://YOUR_APP_ID-dsn.algolia.net/1/indexes/tradingsystem-docs" \
  -H "X-Algolia-API-Key: YOUR_SEARCH_API_KEY" \
  -H "X-Algolia-Application-Id: YOUR_APP_ID"
```

---

## 📈 Analytics Commands (After Setup)

### Google Analytics

```bash
# Verify GA tag in built site
grep -r "gtag" build/

# Check if tracking is firing (browser console)
# Look for: gtag() calls in Network tab
```

---

### Plausible Analytics

```bash
# Verify Plausible script in built site
grep -r "plausible.io" build/

# Check dashboard
# Visit: https://plausible.io/tradingsystem-docs.example.com
```

---

## 🔄 Version Management

### Create New Version

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Create version snapshot
npm run docs:version 1.0.0

# Verify
ls -la versioned_docs/
ls -la versioned_sidebars/
cat versions.json
```

---

### List Versions

```bash
npm run docs:version:list

# Or directly
cat versions.json
```

---

### Build Specific Version

```bash
# Build all versions (default)
npm run docs:build

# Build only current (faster for dev)
NODE_ENV=development npm run docs:build
```

---

## 🔍 Search & Find

### Find Specific Content

```bash
cd /home/marce/Projetos/TradingSystem/docs/content

# Find by filename
find . -name "*workspace*"

# Find by content
grep -r "ProfitDLL" .

# Find files with specific tag
grep -r "tags:.*profitdll" .
```

---

### Count Content

```bash
# Total markdown files
find content -name "*.md" -o -name "*.mdx" | wc -l

# Files by category
find content/apps -name "*.mdx" | wc -l
find content/api -name "*.mdx" | wc -l
find content/tools -name "*.mdx" | wc -l
```

---

## 📝 Content Creation

### Create New Document

```bash
cd /home/marce/Projetos/TradingSystem/docs

# Using helper script
npm run docs:new

# Follow prompts for:
# - Category (apps, api, tools, etc.)
# - Title
# - Template (guide, reference, etc.)
```

---

### Frontmatter Template

```yaml
---
title: "Your Document Title"
sidebar_position: 1
description: "Brief description for SEO and search"
tags: [category, topic, keyword]
owner: DocsOps
lastReviewed: "2025-11-02"
---

# Your Document Title

Content here...
```

---

## 🧪 Testing Commands

### Test Single File

```bash
# Lint specific file
npx markdownlint docs/content/path/to/file.mdx

# Typecheck specific file (if TypeScript/MDX)
# (Requires full project typecheck)
npm run docs:typecheck
```

---

### Test API Specs

```bash
# Validate OpenAPI spec
npx @redocly/cli lint docs/static/specs/workspace.openapi.yaml

# Preview spec locally
npx @redocly/cli preview-docs docs/static/specs/workspace.openapi.yaml
```

---

## 📊 Reporting

### Generate Reports

```bash
cd /home/marce/Projetos/TradingSystem

# Frontmatter report
python3 scripts/docs/validate-frontmatter.py \
  --schema v2 \
  --docs-dir ./docs/content \
  --output ./docs/reports/frontmatter-$(date +%Y%m%d).json

# Link report
cd docs
npm run docs:links > reports/links-$(date +%Y%m%d).log 2>&1

# Build report
npm run docs:build > reports/build-$(date +%Y%m%d).log 2>&1
```

---

## 🔗 Useful One-Liners

```bash
# Count total docs
find docs/content -name "*.mdx" -o -name "*.md" | wc -l

# Find docs updated today
find docs/content -name "*.mdx" -mtime 0

# List all ADRs
find docs/content/reference/adrs -name "*.md" | sort

# Get frontmatter from file
head -20 docs/content/api/overview.mdx | sed -n '/^---$/,/^---$/p'

# Check which version is current
cat docs/versions.json | jq '.[0]'

# Find files without owner
grep -L "owner:" docs/content/**/*.mdx

# Check build size
du -sh docs/build/

# Count warnings in last build
npm run docs:build 2>&1 | grep -c "WARNING"
```

---

## 📚 Reference

**Full Documentation**:
- `reports/2025-11-02/README-REVIEW-2025-11-02.md` - Start aqui
- `reports/2025-11-02/REVIEW-INDEX-2025-11-02.md` - Índice completo

**Guides**:
- [Deployment Guide](./deployment-guide) - Deploy procedures
- [Algolia Setup](./algolia-setup-guide) - Search setup

**Reports**:
- `reports/2025-11-02/DOCUSAURUS-REVIEW-REPORT-2025-11-02.md` - Technical analysis
- `reports/2025-11-02/STAGING-TEST-REPORT-2025-11-02.md` - Test results

---

**Keep this file bookmarked for quick reference!** 🔖
