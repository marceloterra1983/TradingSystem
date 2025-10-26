---
title: "Root Wrapper Symlink Migration"
tags: [operations, deployment, maintenance, scripts]
domain: ops
type: guide
summary: "Migration of root wrapper scripts to symlinks for better maintainability"
status: active
last_review: "2025-10-20"
sidebar_position: 1
---

# Root Wrapper Symlink Migration

## Overview

All root wrapper scripts have been converted to **symlinks** for better maintainability and consistency. This ensures a single source of truth and eliminates duplicate code.

## Changes Implemented

### 1. `reiniciar` → Symlink

**Before:** Standalone script with duplicate code
**After:** Symlink to `scripts/startup/restart-dashboard-stack.sh`

```bash
# File structure
reiniciar -> scripts/startup/restart-dashboard-stack.sh
```

**Benefits:**
- Single source of truth
- No code duplication
- Easier maintenance

### 2. `start-tradingsystem` → Symlink

**Before:** Wrapper script delegating to `scripts/startup/start-tradingsystem-full.sh`
**After:** Direct symlink

```bash
# File structure
start-tradingsystem -> scripts/startup/start-tradingsystem-full.sh
```

**Benefits:**
- Eliminates extra indirection
- Faster execution
- Cleaner codebase

### 3. `stop-tradingsystem` → Symlink

**Before:** Wrapper script delegating to `scripts/shutdown/stop-tradingsystem-full.sh`
**After:** Direct symlink

```bash
# File structure
stop-tradingsystem -> scripts/shutdown/stop-tradingsystem-full.sh
```

**Benefits:**
- Consistency with `start-tradingsystem`
- Single source of truth
- Easier debugging

## Symlink-Safe Path Resolution

All target scripts now use **symlink-safe path resolution**:

```bash
# Standard pattern used in all scripts
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
```

**This resolves:**
- Symlinks to their real target
- Relative paths correctly
- Works from any calling location

## Scripts Updated

| Script | Change | Status |
|--------|--------|--------|
| `scripts/startup/restart-dashboard-stack.sh` | ✅ Already symlink-safe | No change needed |
| `scripts/startup/start-tradingsystem-full.sh` | ✅ Updated to symlink-safe | Fixed |
| `scripts/shutdown/stop-tradingsystem-full.sh` | ✅ Updated to symlink-safe | Fixed |

## Migration Process

### Automated Migration Script

Use the provided migration script:

```bash
bash scripts/maintenance/create-root-symlinks.sh
```

**This script:**
1. Backs up existing files (`.backup-YYYYMMDD-HHMMSS`)
2. Removes old files
3. Creates new symlinks
4. Sets execute permissions
5. Verifies creation

### Manual Migration (if needed)

```bash
cd /home/marce/projetos/TradingSystem

# Backup existing files
mv reiniciar reiniciar.backup
mv start-tradingsystem start-tradingsystem.backup
mv stop-tradingsystem stop-tradingsystem.backup

# Create symlinks
ln -sf scripts/startup/restart-dashboard-stack.sh reiniciar
ln -sf scripts/startup/start-tradingsystem-full.sh start-tradingsystem
ln -sf scripts/shutdown/stop-tradingsystem-full.sh stop-tradingsystem

# Set permissions
chmod +x scripts/startup/restart-dashboard-stack.sh
chmod +x scripts/startup/start-tradingsystem-full.sh
chmod +x scripts/shutdown/stop-tradingsystem-full.sh
```

## Verification

### Check Symlinks

```bash
# List symlinks
ls -lh reiniciar start-tradingsystem stop-tradingsystem

# Expected output (example):
# lrwxrwxrwx 1 user user 43 Oct 20 18:30 reiniciar -> scripts/startup/restart-dashboard-stack.sh
# lrwxrwxrwx 1 user user 44 Oct 20 18:30 start-tradingsystem -> scripts/startup/start-tradingsystem-full.sh
# lrwxrwxrwx 1 user user 45 Oct 20 18:30 stop-tradingsystem -> scripts/shutdown/stop-tradingsystem-full.sh
```

### Test Commands

```bash
# Test each command
./reiniciar
./start-tradingsystem --help
./stop-tradingsystem --help

# Test via aliases (if installed)
start --help
stop --help
```

### Verify Path Resolution

```bash
# Test from different directories
cd /tmp
bash /home/marce/projetos/TradingSystem/start-tradingsystem --help
# Should work correctly

cd /home/marce/projetos/TradingSystem
./start-tradingsystem --help
# Should work correctly
```

## Compatibility

### Backward Compatibility

✅ **100% backward compatible**

- File names unchanged (`reiniciar`, `start-tradingsystem`, `stop-tradingsystem`)
- Command-line arguments unchanged
- Exit codes unchanged
- Output format unchanged

### Alias Compatibility

✅ **Aliases continue to work**

The `install-shortcuts.sh` script creates aliases that reference absolute paths:

```bash
alias start='bash /home/marce/projetos/TradingSystem/start-tradingsystem'
alias stop='bash /home/marce/projetos/TradingSystem/stop-tradingsystem'
```

**These work perfectly with symlinks** because:
- Bash resolves symlinks transparently
- Absolute paths are used
- No relative path issues

## Git Configuration

### `.gitignore` Settings

Root wrappers are **explicitly allowed** in `.gitignore`:

```gitignore
# Allow root wrappers
!/start-tradingsystem
!/stop-tradingsystem
!/reiniciar
```

### Committing Symlinks

Symlinks are tracked by Git like regular files:

```bash
# Stage symlinks
git add reiniciar start-tradingsystem stop-tradingsystem

# Commit
git commit -m "refactor: convert root wrappers to symlinks for better maintainability"

# Push
git push
```

Git stores symlinks as special file types and recreates them on checkout.

## Troubleshooting

### Symlink Broken

**Symptom:** `No such file or directory` when running command

**Solution:**
```bash
# Check if symlink is broken
ls -lh start-tradingsystem
# If red/broken, recreate it

cd /home/marce/projetos/TradingSystem
bash scripts/maintenance/create-root-symlinks.sh
```

### Permission Denied

**Symptom:** `Permission denied` when executing

**Solution:**
```bash
# Set execute permissions on target scripts
chmod +x scripts/startup/restart-dashboard-stack.sh
chmod +x scripts/startup/start-tradingsystem-full.sh
chmod +x scripts/shutdown/stop-tradingsystem-full.sh
```

### Wrong Directory Resolved

**Symptom:** Script can't find files or directories

**Solution:**
Ensure target script uses **symlink-safe resolution** pattern (see above).

### Aliases Not Working

**Symptom:** `command not found` when using aliases

**Solution:**
```bash
# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc

# Or reinstall shortcuts
bash install-shortcuts.sh
source ~/.bashrc
```

## Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Maintainability** | Duplicate code in 3 files | Single source of truth |
| **Debugging** | Must check multiple files | Check one file only |
| **Updates** | Update 3+ locations | Update 1 location |
| **Testing** | Test each wrapper | Test target script |
| **Consistency** | Can diverge over time | Always consistent |
| **File Count** | 3 wrapper + 3 target = 6 | 3 symlink + 3 target = 6 (but cleaner) |

## Future Considerations

### Additional Symlinks

Consider converting other root scripts to symlinks:

- `install-shortcuts.sh` → `scripts/maintenance/install-shortcuts.sh`
- Other frequently updated scripts

### Symlink Verification

Add to CI/CD pipeline:

```bash
# Verify symlinks are not broken
find . -type l -xtype l
# Empty output = all symlinks valid
```

## Related Documentation

- [Universal Startup Commands](./universal-commands.md)
- [Service Startup Guide](./service-startup-guide.md)
- [Environment Configuration](./ENVIRONMENT-CONFIGURATION.md)

---

**Migration completed:** 2025-10-20  
**Scripts updated:** 3 root wrappers + 2 target scripts  
**Status:** ✅ Production ready
