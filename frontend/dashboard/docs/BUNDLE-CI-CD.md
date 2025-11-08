# Bundle Size CI/CD Documentation

**Automated bundle size monitoring and quality gates for TradingSystem Dashboard**

## Overview

The project includes **three layers of bundle size protection**:

1. **Pre-commit Hook** - Local validation before commit
2. **Pull Request Check** - Automated validation on every PR
3. **Weekly Monitoring** - Trend tracking and alerting

## 1. Pre-commit Hook

### What it does

Automatically checks bundle sizes before allowing commits to frontend code.

### Location

`.husky/pre-commit`

### Setup

```bash
cd frontend/dashboard

# Install husky (if not already installed)
npm install --save-dev husky

# Initialize husky
npx husky install

# Make pre-commit executable
chmod +x .husky/pre-commit
```

### Behavior

```bash
# When committing frontend changes:
git add frontend/dashboard/src/components/MyComponent.tsx
git commit -m "feat: add new component"

# Output:
📦 Checking bundle size...
✅ Bundle size check passed
[main abc123] feat: add new component
```

### Skip (if needed)

```bash
# Emergency bypass (not recommended)
git commit --no-verify -m "emergency fix"
```

## 2. Pull Request Check

### What it does

Runs on **every pull request** that modifies frontend code:

1. ✅ Builds production bundle
2. ✅ Validates against size budgets
3. ✅ Compares with base branch
4. ✅ Comments on PR with results
5. ✅ Fails PR if budgets exceeded

### Workflow File

`.github/workflows/bundle-size-check.yml`

### Triggers

```yaml
on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'frontend/dashboard/**'
```

### Example PR Comment

```markdown
## Bundle Size Comparison

| Metric | Base (main) | PR | Difference |
|--------|-------------|-----|-----------|
| **Total Size** | 900 KB | 927 KB | +3.0% |

✅ **Good:** Bundle size increase is within acceptable range

# Bundle Size Report

**Status:** ✅ PASSED
**Total Size:** 927.09KB

## Detailed Results

✓  react-vendor: 42.96KB / 150.00KB (28.6%)
✓  vendor: 185.48KB / 650.00KB (28.5%)
...
```

### CI Status

- **✅ Green check** - All budgets passed
- **❌ Red X** - One or more budgets exceeded

### What happens if check fails?

```
❌ Bundle size check failed!

One or more chunks exceed their size budgets:
✖  agents-catalog: 500KB / 50KB (1000%)

Actions required:
1. Optimize the affected chunks
2. Update budgets if increase is intentional
3. Document why increase is necessary
```

## 3. Weekly Monitoring

### What it does

Runs **every Monday at 9 AM UTC** to:

1. ✅ Track bundle size trends
2. ✅ Store historical metrics
3. ✅ Generate weekly report
4. ✅ Create GitHub issue if size exceeds threshold

### Workflow File

`.github/workflows/bundle-monitoring.yml`

### Metrics Tracked

Stored in `.github/bundle-metrics.json`:

```json
[
  {
    "timestamp": "2025-11-08 09:00:00 UTC",
    "commit": "abc123...",
    "totalSize": 0.93,    // MB
    "jsSize": 0.85,       // MB
    "cssSize": 140.0,     // KB
    "gzipSize": 400.0,    // KB
    "chunkCount": 25
  }
]
```

### Manual Trigger

```bash
# Via GitHub UI:
# Actions → Bundle Size Monitoring → Run workflow
```

### Alert Threshold

Creates GitHub issue if:
- Total bundle > 1.5 MB

### Example Issue

```markdown
⚠️ Bundle Size Alert: Exceeds 1.5 MB

## Bundle Size Alert

Current Size: 1.6 MB
Gzipped: 500 KB

### Immediate Actions Required

1. Review bundle analysis
2. Identify largest chunks
3. Implement optimizations
```

## Configuration

### Bundle Size Budgets

**File:** `scripts/bundle-size-budgets.json`

```json
{
  "budgets": {
    "chunks": {
      "react-vendor": {
        "limit": "150kb",
        "warning": "140kb"
      },
      "agents-catalog": {
        "limit": "50kb",
        "warning": "40kb"
      }
    },
    "total": {
      "limit": "3000kb",
      "warning": "2500kb"
    }
  }
}
```

### Update Budgets

```bash
# Edit budgets
vim scripts/bundle-size-budgets.json

# Test locally
npm run build
npm run check:bundle:size

# Commit changes
git add scripts/bundle-size-budgets.json
git commit -m "chore: update bundle size budgets"
```

## Local Development

### Check Bundle Size

```bash
cd frontend/dashboard

# Build production bundle
npm run build

# Check against budgets
npm run check:bundle:size

# Visual analysis
npm run build && open dist/stats.html
```

### Expected Output

```
✓  react-vendor: 42.96KB / 150.00KB (28.6%)
✓  vendor: 185.48KB / 650.00KB (28.5%)
✓  ui-radix: 20.39KB / 80.00KB (25.5%)
...
============================================================
Total bundle size: 927.09KB / 2.93MB (30.9%)
============================================================
✓ Bundle size check passed
```

## Troubleshooting

### Pre-commit Hook Not Running

```bash
# Reinstall husky
cd frontend/dashboard
npm install
npx husky install

# Make executable
chmod +x .husky/pre-commit
```

### CI Check Failing

**Common causes:**

1. **New dependency added**
   - Check if dependency is necessary
   - Look for lighter alternatives
   - Lazy load if possible

2. **Large data file imported**
   - Move to separate chunk
   - Lazy load on-demand
   - Use metadata-only approach

3. **Code duplication**
   - Review bundle analyzer
   - Extract shared code
   - Check for duplicate dependencies

**Resolution steps:**

```bash
# 1. Analyze bundle locally
npm run build
open dist/stats.html

# 2. Identify large chunks
find dist/assets -name "*.js" -type f -exec ls -lh {} \; | sort -rh -k5 | head -10

# 3. Check for duplicates
npm dedupe

# 4. Update budgets if justified
vim scripts/bundle-size-budgets.json
```

### Weekly Monitoring Not Running

```bash
# Manual trigger:
# 1. Go to GitHub Actions
# 2. Select "Bundle Size Monitoring"
# 3. Click "Run workflow"

# Check cron schedule in:
.github/workflows/bundle-monitoring.yml
```

## Best Practices

### For Developers

✅ **DO:**
- Check bundle size before committing
- Review PR comments about bundle changes
- Lazy load heavy components
- Use dynamic imports for large features
- Monitor bundle analyzer regularly

❌ **DON'T:**
- Skip pre-commit checks without reason
- Ignore CI failures
- Add large dependencies without review
- Import entire libraries (use specific imports)

### For Reviewers

✅ **DO:**
- Review bundle size PR comments
- Ask about bundle increases > 5%
- Verify lazy loading is implemented
- Check bundle analyzer for duplicates

❌ **DON'T:**
- Approve PRs with failed bundle checks
- Ignore large bundle increases
- Merge without understanding impact

## Metrics & Reporting

### View Historical Data

```bash
# Clone repo
git clone <repo-url>

# View metrics history
cat .github/bundle-metrics.json | jq '.'
```

### Generate Trend Chart

```python
import json
import matplotlib.pyplot as plt

# Load metrics
with open('.github/bundle-metrics.json') as f:
    data = json.load(f)

# Extract data
dates = [m['timestamp'] for m in data]
sizes = [m['totalSize'] for m in data]

# Plot
plt.plot(dates, sizes)
plt.title('Bundle Size Trend')
plt.xlabel('Date')
plt.ylabel('Size (MB)')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig('bundle-trend.png')
```

### Weekly Report Location

- **Artifact:** GitHub Actions → Bundle Size Monitoring → Artifacts
- **Contains:**
  - `stats.html` - Interactive bundle visualizer
  - `bundle-weekly-report.md` - Summary report
  - `bundle-check.txt` - Detailed check results

## Integration with Other Tools

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    budgetPath: ./frontend/dashboard/.lighthouserc.json
```

### Bundle Analyzer

```json
// package.json
{
  "scripts": {
    "analyze": "npm run build && open dist/stats.html"
  }
}
```

### Size Limit

```json
// package.json
{
  "size-limit": [
    {
      "path": "dist/assets/index-*.js",
      "limit": "50 KB"
    }
  ]
}
```

## FAQ

**Q: Can I bypass the pre-commit check?**
A: Yes, with `--no-verify`, but only for emergencies. Bundle size issues should be fixed, not bypassed.

**Q: What if I need to increase a budget?**
A: Update `scripts/bundle-size-budgets.json` and document the reason in your PR.

**Q: How do I view the bundle visualization?**
A: Download the `bundle-analysis` artifact from the GitHub Actions run.

**Q: Can I run the CI checks locally?**
A: Yes, `npm run check:bundle:size:strict` runs the same check as CI.

**Q: What's the difference between warning and limit?**
A: Warnings show in reports but don't fail CI. Limits fail CI and block merge.

## Maintenance

### Update Workflows

```bash
# Edit workflow files
vim .github/workflows/bundle-size-check.yml
vim .github/workflows/bundle-monitoring.yml

# Test locally with act (GitHub Actions local runner)
act pull_request -j check-bundle-size
```

### Review Budgets

**Quarterly review checklist:**

- [ ] Review historical trends
- [ ] Update budgets based on actual needs
- [ ] Remove outdated chunk budgets
- [ ] Add budgets for new features
- [ ] Document budget changes

## Resources

- [Bundle Optimization Guide](./BUNDLE-OPTIMIZATION.md)
- [Bundle Size Budgets](../scripts/bundle-size-budgets.json)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Web.dev - Bundle Size](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

---

**Last updated:** 2025-11-08
**Next review:** 2025-12-08
