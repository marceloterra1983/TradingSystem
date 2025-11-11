---
description: Fix all issues without prompting - runs until completion
tags: [automation, fixes, continuous]
---

# Auto-Fix All Issues

**INSTRUCTIONS FOR CLAUDE CODE:**

Execute this workflow **completely and autonomously** until all issues are resolved or a CRITICAL blocker occurs.

## Workflow

1. **Scan for Issues**
   - Run linting: `npm run lint` (all workspaces)
   - Check TypeScript errors: `npm run type-check`
   - Run tests: `npm run test`
   - Check Docker container health: `bash scripts/maintenance/health-check-all.sh --containers-only`

2. **Fix Automatically**
   - Auto-fix linting errors: `npm run lint:fix`
   - Auto-format code: `npm run format`
   - Fix simple TypeScript errors (missing imports, unused variables)
   - Restart unhealthy containers

3. **Verify Fixes**
   - Re-run all checks from step 1
   - If new errors appear, repeat step 2
   - Continue until:
     - ✅ All checks pass, OR
     - ⚠️ Only warnings remain (acceptable), OR
     - 🛑 Critical error requires human intervention

4. **Report Results**
   - Summary of fixes applied
   - Final status of all checks
   - List any remaining issues that need manual attention

## Rules

- **DO NOT STOP** to ask for confirmation unless:
  - A fix would delete production data
  - A fix requires sudo/admin privileges
  - A fix involves external API calls (deployments, git push)
  - A critical error cannot be resolved automatically

- **ALWAYS**:
  - Use TodoWrite to track progress
  - Mark tasks as completed immediately after finishing
  - Continue to next task without waiting
  - Log all actions taken

- **ACCEPTABLE OUTCOMES**:
  - All checks passing (100% success)
  - Only warnings remaining (acceptable quality)
  - Partial fix with clear remaining tasks (requires manual follow-up)

## Examples

### Scenario 1: Linting Errors
```bash
# Found 47 linting errors
npm run lint:fix
# Fixed 45 errors, 2 warnings remain
# ✅ Continue (warnings acceptable)
```

### Scenario 2: TypeScript Errors
```typescript
// Error: Cannot find module 'react'
// Fix: Add import automatically
import React from 'react';
// ✅ Continue to next error
```

### Scenario 3: Container Unhealthy
```bash
# workspace-api: unhealthy
docker compose -f tools/compose/docker-compose.apps.yml restart workspace
# ✅ Wait 30s, verify health, continue
```

### Scenario 4: Critical Blocker (STOP)
```bash
# Error: Database migration failed - data corruption risk
# 🛑 STOP and report to user
```

## Success Criteria

Mark task as **COMPLETED** when:
- ✅ All critical errors fixed
- ✅ All tests passing (or only warnings)
- ✅ All containers healthy
- ✅ Code quality meets project standards

Report **PARTIAL SUCCESS** with remaining tasks if:
- ⚠️ Some fixes require manual intervention
- ⚠️ Breaking changes detected (need approval)
- ⚠️ External dependencies unavailable

## Integration

This command integrates with:
- `/husky` - Pre-commit hooks
- `/code-review` - Quality validation
- `/health-check` - System verification
- `/lint` - Specific linting fixes
- `/format` - Code formatting

---

**TIP:** Use `/fix` before commits to ensure clean code quality!
