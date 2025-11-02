# Security Audit Command

Execute npm audit para verificar vulnerabilidades em dependências.

## Usage

```bash
/audit [target] [options]
```

## Targets

- `frontend` - Audit frontend/dashboard (default)
- `backend` - Audit all backend APIs
- `all` - Audit frontend + backend

## Options

- `--fix` - Auto-fix vulnerabilities (pode quebrar dependências!)
- `--level <severity>` - Filter by severity: low, moderate, high, critical
- `--production` - Only production dependencies
- `--json` - Output JSON format

## Examples

```bash
# Audit frontend
/audit

# Only high/critical vulnerabilities
/audit --level high

# Auto-fix (CUIDADO!)
/audit --fix

# Audit all projects
/audit all

# JSON output
/audit --json

# Production dependencies only
/audit --production
```

## Implementation

```bash
# Frontend
if [[ "{{target}}" == "frontend" ]] || [[ "{{target}}" == "" ]]; then
  cd frontend/dashboard

  cmd="npm audit"

  if [[ "{{args}}" == *"--fix"* ]]; then
    cmd="npm audit fix"
  elif [[ "{{args}}" == *"--level"* ]]; then
    level=$(echo "{{args}}" | grep -oP '(?<=--level )\w+')
    cmd="npm audit --audit-level=$level"
  fi

  if [[ "{{args}}" == *"--production"* ]]; then
    cmd="$cmd --production"
  fi

  if [[ "{{args}}" == *"--json"* ]]; then
    cmd="$cmd --json"
  fi

  eval "$cmd"
  cd ../..
fi

# Backend
if [[ "{{target}}" == "backend" ]] || [[ "{{target}}" == "all" ]]; then
  for api in backend/api/*/; do
    cd "$api"
    if [[ -f "package.json" ]]; then
      echo "Auditing $api..."
      npm audit --audit-level=high || true
    fi
    cd ../../..
  done
fi
```

## Severity Levels

| Level | Action | Timeline |
|-------|--------|----------|
| **Critical** | ❌ Fix immediately | < 24h |
| **High** | ⚠️  Fix urgently | < 7 days |
| **Moderate** | ⚠️  Review and plan | < 30 days |
| **Low** | ℹ️  Monitor | Backlog |

## Understanding Output

```bash
# Vulnerabilities found: 5 (2 low, 1 moderate, 2 high)
```

- **Severity**: critical > high > moderate > low
- **Path**: Which dependency chain caused it
- **Recommendation**: Action to fix

## Auto-Fix Warnings

⚠️ **CUIDADO com `npm audit fix`**:

- Pode atualizar dependências para versões breaking
- Pode quebrar o build
- Sempre teste após auto-fix
- Considere `npm audit fix --dry-run` primeiro

### Safe Fix Process

```bash
# 1. Dry run (ver o que seria modificado)
npm audit fix --dry-run

# 2. Backup package-lock.json
cp package-lock.json package-lock.json.backup

# 3. Fix
npm audit fix

# 4. Test
npm test && npm run build

# 5. Se quebrou, restore
# cp package-lock.json.backup package-lock.json
# npm install
```

## Alternative: Snyk

Para análise mais robusta:

```bash
# Install
npm install -g snyk

# Authenticate
snyk auth

# Test
snyk test

# Monitor (continuous)
snyk monitor

# Fix interactively
snyk wizard
```

## Ignoring Vulnerabilities

Se não puder corrigir imediatamente (ex: dependência do framework):

```bash
# Criar .npmrc
echo "audit-level=high" >> .npmrc

# Ou usar --audit-level no CI
npm install --audit-level=high
```

## CI/CD Integration

```yaml
# .github/workflows/security.yml
- name: Security Audit
  run: |
    cd frontend/dashboard
    npm audit --audit-level=high
    # Fail build se encontrar high/critical
```

## Related Commands

- `/quality-check` - Full quality check (includes audit)
- `/dependencies` - List and update dependencies
- `/snyk` - Run Snyk security scan
