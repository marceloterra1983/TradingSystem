# Git Setup - Quick Guide

## ⚠️ Git Identity Not Configured

You need to configure your Git identity before making commits.

## 🚀 Quick Setup (Choose One Option)

### Option 1: Interactive Script (Recommended)

```bash
cd /home/marce/projetos/TradingSystem
chmod +x scripts/git/configure-identity.sh
bash scripts/git/configure-identity.sh
```

**This will:**
- Detect if you have global Git config
- Let you configure for this repository only OR globally
- Validate your email format
- Show confirmation

---

### Option 2: Manual Configuration (Global)

Set Git identity for **all repositories** on this machine:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Example:**
```bash
git config --global user.name "Marcelo"
git config --global user.email "marcelo@example.com"
```

---

### Option 3: Manual Configuration (Local Only)

Set Git identity **only for this repository**:

```bash
cd /home/marce/projetos/TradingSystem
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

**Example:**
```bash
git config user.name "Marcelo"
git config user.email "marcelo@tradingsystem.local"
```

---

## ✅ Verify Configuration

```bash
# Check global config
git config --global user.name
git config --global user.email

# Check local config (repository-specific)
cd /home/marce/projetos/TradingSystem
git config user.name
git config user.email

# View all config
git config --list
```

---

## 🔄 After Configuration - Make the Commit

Once Git identity is configured, you can make the commit:

```bash
cd /home/marce/projetos/TradingSystem

# Stage files
git add \
  reiniciar \
  start-tradingsystem \
  stop-tradingsystem \
  scripts/startup/start-tradingsystem-full.sh \
  scripts/shutdown/stop-tradingsystem-full.sh \
  scripts/maintenance/create-root-symlinks.sh \
  scripts/git/configure-identity.sh \
  docs/context/ops/SYMLINK-MIGRATION.md \
  VERIFICATION-COMMENTS-IMPLEMENTED.md \
  GIT-SETUP.md

# Commit
git commit -m "refactor: convert root wrappers to symlinks with robust path resolution

- Convert reiniciar, start-tradingsystem, stop-tradingsystem to symlinks
- Update start-tradingsystem-full.sh with symlink-safe path resolution
- Update stop-tradingsystem-full.sh with symlink-safe path resolution
- Add migration script: scripts/maintenance/create-root-symlinks.sh
- Add Git identity configuration script: scripts/git/configure-identity.sh
- Add documentation: docs/context/ops/SYMLINK-MIGRATION.md

Fixes: Incorrect ROOT_DIR computation when called via symlink
Implements: Verification comments 1 and 2"

# Verify commit
git log -1 --stat
```

---

## 📝 Recommended Identity

For a local development setup, you can use:

```bash
# Example for local machine
git config --global user.name "Marcelo"
git config --global user.email "marcelo@local.dev"
```

Or with your actual email:

```bash
git config --global user.name "Marcelo Silva"
git config --global user.email "marcelo@example.com"
```

---

## 🔍 Understanding Git Config Levels

Git has 3 configuration levels (in order of precedence):

1. **Local** (repository-specific): `.git/config`
   - Set with: `git config user.name "Name"`
   - Only affects current repository

2. **Global** (user-specific): `~/.gitconfig`
   - Set with: `git config --global user.name "Name"`
   - Affects all repositories for this user

3. **System** (machine-wide): `/etc/gitconfig`
   - Set with: `git config --system user.name "Name"`
   - Requires admin/sudo, affects all users

**Precedence:** Local > Global > System

---

## 💡 Tips

### Check Which Config is Being Used

```bash
git config --show-origin user.name
git config --show-origin user.email
```

### Edit Config File Directly

```bash
# Edit global config
git config --global --edit

# Edit local config (for this repository)
git config --edit
```

### Remove Config

```bash
# Remove global
git config --global --unset user.name
git config --global --unset user.email

# Remove local
git config --unset user.name
git config --unset user.email
```

---

## 🆘 Troubleshooting

### Error: "empty ident name not allowed"

**Cause:** Git identity not configured

**Solution:** Configure using any of the options above

### Error: "Author identity unknown"

**Cause:** Git can't determine who you are

**Solution:** Set `user.name` and `user.email` as shown above

### Using Different Identities per Repository

If you work on multiple projects with different identities:

```bash
# For work projects
cd ~/work/project
git config user.name "Marcelo Work"
git config user.email "marcelo@company.com"

# For personal projects
cd ~/personal/project
git config user.name "Marcelo Personal"
git config user.email "marcelo@personal.com"
```

---

## ✅ Next Steps

1. **Configure Git identity** (choose option above)
2. **Verify configuration** (`git config --list`)
3. **Make the commit** (commands provided above)
4. **Check commit** (`git log -1`)

---

## 📚 Additional Resources

- [Git Config Documentation](https://git-scm.com/docs/git-config)
- [First-Time Git Setup](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup)
- [Customizing Git Configuration](https://git-scm.com/book/en/v2/Customizing-Git-Git-Configuration)

---

**Quick start command:**
```bash
bash scripts/git/configure-identity.sh
```
