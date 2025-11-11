# Governance JSON Sanitization - Standard Operating Procedure (SOP)

**Control ID:** SOP-GOV-002
**Version:** 1.0.0
**Last Updated:** 2025-11-07
**Owner:** DevOps Team
**Reviewers:** AI Agents, Documentation Team, Frontend Team

---

## 🎯 Purpose

This SOP prevents **JSON parsing errors** in the Governance Hub frontend caused by control characters or malformed content in `frontend/dashboard/public/data/governance/latest.json`.

## 🚨 Critical Rule for AI Agents

**ALWAYS sanitize file content before embedding in JSON payloads!**

```javascript
// ❌ WRONG: Direct file content in JSON
const content = await fs.readFile(filePath, 'utf-8');
const json = JSON.stringify({ previewContent: content }); // Can break!

// ✅ CORRECT: Sanitize before JSON serialization
const content = await fs.readFile(filePath, 'utf-8');
const sanitized = sanitizeForJson(content);
const json = JSON.stringify({ previewContent: sanitized }); // Safe!
```

---

## 📋 Problem Definition

### Root Cause

The governance metrics script (`governance/automation/governance-metrics.mjs`) reads markdown files and embeds their content in JSON:

```javascript
async function readArtifactSource(relPath) {
  const content = await fs.readFile(absolutePath, 'utf-8');
  return content; // ❌ Raw content can contain control characters
}
```

**Problem**: Markdown files may contain:
- Control characters (0x00-0x1F, 0x7F) from copy-paste or editor quirks
- Literal `\n` sequences that should be escaped
- Very large content (>1MB) causing performance issues

**Result**:
```
Bad control character in string literal in JSON at position 321342 (line 675 column 1309)
```

### NGINX Error Pattern (If Deployed)

```
[error] JSON parsing failed in dashboard frontend
```

---

## 🔍 Detection Methods

### 1. Visual Detection (User Reports)

**Symptoms:**
- Governance Hub shows "Snapshot indisponível"
- Error message: "Bad control character in string literal in JSON"
- Dashboard displays "0 Documentos rastreados"
- Browser console shows JSON parsing error

### 2. Automated Detection (Validation Script)

```bash
# Quick validation
bash scripts/governance/validate-governance-json.sh

# Detailed check with Node.js
node -e "
try {
  const fs = require('fs');
  const content = fs.readFileSync('frontend/dashboard/public/data/governance/latest.json', 'utf8');
  JSON.parse(content);
  console.log('✅ JSON is valid');
} catch (err) {
  console.log('❌ Error:', err.message);
  process.exit(1);
}
"
```

### 3. Pre-deployment Validation

```bash
# Verify JSON is valid before committing
if ! node -e "JSON.parse(require('fs').readFileSync('frontend/dashboard/public/data/governance/latest.json'))"; then
  echo "❌ ERROR: Governance JSON is invalid!"
  exit 1
fi
```

---

## ✅ Standard Operating Procedures

### SOP 1: Initial Setup

**When:** First time deploying governance dashboard

```bash
#!/bin/bash
# File: scripts/governance/initial-deploy.sh

set -euo pipefail

echo "📊 Governance Dashboard Initial Deployment"

# 1. Generate governance snapshot
cd governance/automation
node governance-metrics.mjs

# 2. Validate JSON
cd ../..
bash scripts/governance/validate-governance-json.sh

# 3. Start dashboard
cd frontend/dashboard
npm run dev

echo "✅ Governance dashboard deployed!"
echo "🌐 Access at: http://localhost:9080/#/governance"
```

### SOP 2: Content Update Deployment

**When:** Governance artifacts changed

```bash
#!/bin/bash
# File: scripts/governance/update-deploy.sh

set -euo pipefail

echo "📝 Updating governance snapshot"

# 1. Regenerate snapshot with sanitization
node governance/automation/governance-metrics.mjs

# 2. Validate JSON
bash scripts/governance/validate-governance-json.sh

# 3. Restart dashboard (if running)
if curl -sf http://localhost:9080/health > /dev/null 2>&1; then
  echo "✅ Dashboard running - changes will be picked up"
else
  echo "⚠️  Dashboard not running - start with: npm run dev"
fi

echo "✅ Governance snapshot updated!"
```

### SOP 3: Emergency Recovery

**When:** Frontend shows JSON parsing error

```bash
#!/bin/bash
# File: scripts/governance/emergency-recovery.sh

set -euo pipefail

echo "🚨 Governance JSON Emergency Recovery"

# 1. Backup corrupted file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp frontend/dashboard/public/data/governance/latest.json \
   frontend/dashboard/public/data/governance/backup_${TIMESTAMP}.json

# 2. Regenerate with sanitization
node governance/automation/governance-metrics.mjs

# 3. Validate
bash scripts/governance/validate-governance-json.sh || {
  echo "❌ Validation failed after regeneration"
  exit 1
}

echo "✅ Recovery successful!"
```

---

## 🤖 AI Agent Instructions

### Red Flags (Immediate Action Required)

If you encounter **ANY** of these patterns, **STOP and follow recovery procedure**:

```
❌ User: "Governance Hub showing JSON error"
❌ User: "Snapshot indisponível"
❌ User: "Bad control character in string literal"
❌ Browser Console: "JSON.parse: bad control character"
❌ Error mentions: position 321342 or similar
```

### Automated Recovery Workflow

```markdown
## Step 1: Diagnose
- Check if latest.json exists
- Validate JSON syntax: `node -e "JSON.parse(...)"`
- Check file size (should be < 2MB)

## Step 2: Regenerate Snapshot
node governance/automation/governance-metrics.mjs

## Step 3: Validate
bash scripts/governance/validate-governance-json.sh

## Step 4: Verify Frontend
- Clear browser cache (Ctrl+Shift+R)
- Navigate to http://localhost:9080/#/governance
- Confirm snapshot loads

## Step 5: Document
Create incident report in outputs/ if this was a production issue
```

### Prevention Checklist

Before modifying governance artifacts or regenerating snapshot:

- [ ] ✅ Ensure `sanitizeForJson()` function is present in metrics script
- [ ] ✅ Run validation after generation
- [ ] ✅ Check file size is reasonable (< 2MB)
- [ ] ✅ Test in browser before committing
- [ ] ✅ Scan for control characters

---

## 🔧 Automated Validation Scripts

### Pre-commit Hook

**File:** `.git/hooks/pre-commit`

```bash
#!/bin/bash
# Validate governance JSON before commit

if git diff --cached --name-only | grep -q "frontend/dashboard/public/data/governance/latest.json"; then
  echo "📊 Governance JSON changed - validating..."

  if ! bash scripts/governance/validate-governance-json.sh > /dev/null 2>&1; then
    echo "❌ Governance JSON validation failed!"
    echo "Run: bash scripts/governance/validate-governance-json.sh"
    exit 1
  fi

  echo "✅ Governance JSON is valid"
fi
```

### CI/CD Validation

**File:** `.github/workflows/governance-validation.yml`

```yaml
name: Governance Validation

on:
  pull_request:
    paths:
      - 'governance/**'
      - 'frontend/dashboard/public/data/governance/**'

jobs:
  validate-json:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Regenerate governance snapshot
        run: node governance/automation/governance-metrics.mjs

      - name: Validate JSON
        run: bash scripts/governance/validate-governance-json.sh

      - name: Check file size
        run: |
          SIZE=$(stat -c%s frontend/dashboard/public/data/governance/latest.json)
          if [ $SIZE -gt 5242880 ]; then # 5MB
            echo "❌ JSON file too large: $SIZE bytes"
            exit 1
          fi
          echo "✅ File size OK: $SIZE bytes"
```

### Automated Sanitization

**File:** `governance/automation/governance-metrics.mjs` (already implemented)

```javascript
/**
 * Sanitizes text content for safe JSON embedding.
 * Removes control characters and limits length to prevent JSON parsing errors.
 */
function sanitizeForJson(content) {
  if (!content) return null;

  // Remove control characters (keep only \n, \t, \r)
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length to 10,000 chars per artifact
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + '\n\n[... content truncated ...]';
  }

  return sanitized;
}
```

---

## 📊 Monitoring & Alerts

### Health Check Endpoint

Add to Service Launcher or Dashboard backend:

```javascript
app.get('/api/governance/health', async (req, res) => {
  try {
    const content = await fs.readFile(
      'frontend/dashboard/public/data/governance/latest.json',
      'utf-8'
    );
    JSON.parse(content); // Validate JSON
    res.json({ status: 'healthy', size: content.length });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Prometheus Metrics

```promql
# Alert on governance JSON errors
governance_json_parse_errors_total > 0

# Alert on file size
governance_json_size_bytes > 5242880
```

---

## 📝 Incident Response Template

**File:** `outputs/GOVERNANCE-JSON-INCIDENT-TEMPLATE.md`

```markdown
# Governance JSON Error - Incident Report

**Date:** YYYY-MM-DD HH:MM
**Reported By:** [User/System]
**Severity:** P1 (Dashboard Feature Down)

## Symptoms
- [ ] "Snapshot indisponível" message in Governance Hub
- [ ] "Bad control character" JSON parsing error
- [ ] Browser console shows JSON.parse error
- [ ] Dashboard displays "0 Documentos rastreados"

## Root Cause
- [ ] Control characters in artifact preview content
- [ ] Missing sanitization in metrics generation
- [ ] Corrupted governance artifact file
- [ ] File size exceeded limits

## Resolution Steps Taken
1. Verified JSON invalid: `node -e "JSON.parse(...)"`
2. Regenerated snapshot: `node governance/automation/governance-metrics.mjs`
3. Validated output: `bash scripts/governance/validate-governance-json.sh`
4. Tested in browser: http://localhost:9080/#/governance

## Prevention
- Added sanitization function: `sanitizeForJson()`
- Created validation script: `scripts/governance/validate-governance-json.sh`
- Documented in: governance/controls/governance-json-sanitization-sop.md

## Timeline
- HH:MM - Issue detected
- HH:MM - Root cause identified (control characters at position X)
- HH:MM - Fix applied (sanitization added)
- HH:MM - Snapshot regenerated
- HH:MM - Service restored
```

---

## 🎓 Training & Knowledge Transfer

### For Developers

**Read these docs in order:**
1. This SOP (governance-json-sanitization-sop.md)
2. Metrics generation script (`governance/automation/governance-metrics.mjs`)
3. Validation script (`scripts/governance/validate-governance-json.sh`)

**Quick commands reference:**
```bash
# Regenerate snapshot
node governance/automation/governance-metrics.mjs

# Validate JSON
bash scripts/governance/validate-governance-json.sh

# Emergency recovery
bash scripts/governance/emergency-recovery.sh

# Check in browser
open http://localhost:9080/#/governance
```

### For AI Agents

**Required reading before ANY governance changes:**
- This SOP (you are here)
- `CLAUDE.md` - Section on governance
- Docusaurus SOP (`governance/controls/docusaurus-deployment-sop.md`) for similar patterns

**Automated workflow:**
1. Detect user issue (keywords: JSON error, snapshot, governance hub)
2. Run diagnostics: `bash scripts/governance/validate-governance-json.sh`
3. Regenerate if needed: `node governance/automation/governance-metrics.mjs`
4. Document resolution in `outputs/`
5. Update this SOP if new pattern discovered

---

## 🔄 Maintenance

### Weekly Review

- [ ] Check JSON file size trend
- [ ] Review validation errors in logs
- [ ] Update artifact content length limits if needed

### Monthly Review

- [ ] Review incident reports for new patterns
- [ ] Update sanitization rules
- [ ] Test emergency recovery procedure
- [ ] Verify CI/CD validations working

### Quarterly Audit

- [ ] Review all governance artifact files for quality
- [ ] Update training materials
- [ ] Test disaster recovery
- [ ] Update metrics and alerts

---

## 📚 References

- [JSON Specification](https://www.json.org/json-en.html)
- [Control Characters in ASCII](https://en.wikipedia.org/wiki/Control_character)
- Related SOPs:
  - [Docusaurus Deployment SOP](./docusaurus-deployment-sop.md)
  - [Environment Variables SOP](../docs/content/tools/security-config/env.mdx)

---

**Version History:**

| Version | Date       | Changes                               | Author   |
|---------|------------|---------------------------------------|----------|
| 1.0.0   | 2025-11-07 | Initial SOP creation with sanitization | AI Agent |

**Approval:**

- [ ] DevOps Team Lead
- [ ] Frontend Team Lead
- [ ] AI Agent Review
