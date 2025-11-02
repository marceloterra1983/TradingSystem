# Quality Check Command

Execute verificação completa de qualidade de código incluindo linting, type checking, testes, security audit e análise de bundle.

## Usage

```bash
/quality-check [options]
```

## Options

- `--fix` - Auto-fix linting and formatting issues
- `--full` - Run full analysis (including slow checks like duplication, dead code)
- `--frontend` - Check only frontend code
- `--backend` - Check only backend code
- `--format html` - Generate HTML report
- `--format json` - Generate JSON report

## Examples

```bash
# Basic quality check
/quality-check

# Auto-fix issues
/quality-check --fix

# Full analysis with HTML report
/quality-check --full --format html

# Frontend only
/quality-check --frontend
```

## What It Checks

1. **ESLint** - Code quality and style
2. **TypeScript** - Type errors
3. **Tests** - Unit tests with coverage
4. **Security** - npm audit for vulnerabilities
5. **Bundle Size** - Production build analysis (--full only)
6. **Code Duplication** - jscpd analysis (--full only)
7. **Dead Code** - Unused exports (--full only)
8. **Docker Health** - Container status

## Expected Output

```
==========================================
Code Quality Check - TradingSystem
==========================================

[SUCCESS] ✅ ESLint passed (0 errors)
[SUCCESS] ✅ TypeScript check passed (0 type errors)
[SUCCESS] ✅ All tests passed
[INFO] Coverage: 82.5%
[SUCCESS] ✅ No high/critical vulnerabilities
[SUCCESS] ✅ All containers healthy

==========================================
Summary
==========================================
Total Checks: 7
Passed: 7 ✅
Warnings: 0 ⚠️
Failed: 0 ❌
```

## Implementation

Execute the automated quality check script:

```bash
bash scripts/maintenance/code-quality-check.sh {{args}}
```

## Related Commands

- `/lint` - ESLint only
- `/test` - Tests only
- `/audit` - Security audit only
- `/build` - Build verification

## Documentation

- [Code Quality Checklist](../../docs/content/development/code-quality-checklist.md)
- [Quick Reference](../../CODE-QUALITY-COMMANDS.md)
