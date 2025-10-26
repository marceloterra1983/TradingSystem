---
title: Linux / WSL Setup Checklist
sidebar_position: 10
tags: [ops, linux, wsl, checklist]
domain: ops
type: reference
summary: Step-by-step checklist to validate a fresh TradingSystem workstation on Linux or WSL2
status: active
last_review: "2025-10-17"
---

# Linux / WSL Setup Checklist

Follow this checklist after cloning the repository on Linux or WSL2.  
Mark off each item as you complete it; every section includes verification commands.

## 1. Prepare Scripts

```bash
chmod +x tools/scripts/*.sh
ls -la tools/scripts/*.sh
```

✅ Expected: every script displays execute permissions (`-rwxr-xr-x`).

## 2. System Dependencies

- `node --version` / `npm --version`
- Install via `nvm` if missing:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  source ~/.bashrc
  nvm install --lts && nvm use --lts
  ```
- `docker --version` and `docker compose version`
- If Docker is absent:
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  ```
  Re-login before proceeding.
- Optional terminal emulator (e.g., `sudo apt install gnome-terminal`).
- Utility packages:
  ```bash
  sudo apt install -y git curl wget build-essential lsof net-tools
  ```

## 3. Directory Layout

```bash
mkdir -p apps/tp-capital/logs
mkdir -p backend/api/idea-bank/uploads
mkdir -p backend/api/documentation-api/uploads
```

## 4. Environment Files

- TP-Capital:
  ```bash
  cd apps/tp-capital/infrastructure
  cp tp-capital-signals.env.example tp-capital-signals.env
  ```
- Populate secrets (tokens, webhook URLs) manually.

## 5. Shell Environment

Append to `~/.bashrc` (or `~/.zshrc`):

```bash
export TRADING_SYSTEM_ROOT="$HOME/projetos/TradingSystem"
export PATH="$TRADING_SYSTEM_ROOT/tools/scripts:$PATH"
export COMPOSE_PROFILES=linux
```

Reload with `source ~/.bashrc` and confirm using `echo $TRADING_SYSTEM_ROOT`.

## 6. npm Dependencies

```bash
cd backend/api/idea-bank && npm install && cd -
cd apps/service-launcher && npm install && cd -
cd frontend/dashboard && npm install && cd -
cd docs && npm install && cd -
```

## 7. Docker Access

```bash
docker ps
```

- If permission denied: `groups | grep docker`.  
  Missing? Run `sudo usermod -aG docker $USER` and log back in.

## 8. Editor Tooling

- Install recommended extensions: Remote-WSL, Docker, ESLint, Prettier, GitLens.
- Ensure `.vscode/` or Cursor settings align with Linux paths.

## 9. Script Smoke Tests

- Service launcher:
  ```bash
  ./tools/scripts/start-service-launcher.sh
  curl http://localhost:9999/health
  pkill -f "node.*service-launcher"
  ```
- Full dev stack:
  ```bash
  ./tools/scripts/start-trading-system-dev.sh
  lsof -i :3200
  lsof -i :5173
  ```
- Monitoring stack:
  ```bash
  cd tools/monitoring
  COMPOSE_PROFILES=linux docker compose up -d
  docker ps
  docker compose down
  ```
  ```bash
  # Visit http://localhost:3001
  ```

## 10. Git Configuration

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git config --global core.autocrlf input
```

## 11. Optional Hardening

- Firewall (UFW):
  ```bash
  sudo ufw allow 3000,3001,3004,3200,5173,9090,9093,9999/tcp
  sudo ufw status
  ```
- Backups:
  ```bash
  tar -czf ~/trading-system-backup-$(date +%Y%m%d).tar.gz \
    data/ \
    apps/tp-capital/tools/tp-capital-signals.env
  ls -lh ~/trading-system-backup-*.tar.gz
  ```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Scripts fail with `permission denied` | Re-run `chmod +x tools/scripts/*.sh`. |
| Docker requires `sudo` | Add yourself to the `docker` group and re-login. |
| Port already in use | `lsof -i :<PORT>` then `kill -9 <PID>`. |
| Strange npm errors | Remove `node_modules` and `package-lock.json`, re-run `npm install`. |

## Completion Snapshot

- [ ] Scripts executable
- [ ] System dependencies installed
- [ ] Directories created
- [ ] `.env` files configured
- [ ] Environment variables exported
- [ ] npm dependencies installed
- [ ] Docker usable without `sudo`
- [ ] Editor tooling ready
- [ ] Smoke tests executed
- [ ] Git configured
- [ ] (Optional) Firewall + backups

Once complete, the workstation is ready to run the TradingSystem stack on Linux/WSL. Cross-reference the [linux-migration-guide](../linux-migration-guide.md) for rationale and deeper context.
