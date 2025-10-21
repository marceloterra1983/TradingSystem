---
title: Linux / WSL Migration Guide
sidebar_position: 40
tags: [ops, linux, wsl, migration]
domain: ops
type: guide
summary: Playbook to migrate the TradingSystem workspace from Windows to Linux or WSL2
status: active
last_review: 2025-10-17
---

# Linux / WSL Migration Guide

This guide documents the full migration of the TradingSystem project to Linux (native) and Windows Subsystem for Linux 2 (WSL2).  
Use it when spinning up a fresh workstation or when moving existing services away from Windows-only tooling.

## Target Environment

- Ubuntu 22.04 LTS (native or WSL2) with `systemd` enabled.
- Docker Engine + Docker Compose v2 available without `sudo`.
- Node.js 20 LTS, Python 3.11, and .NET 8 SDK.
- Terminal emulator (prefer `gnome-terminal`; fallback to `konsole` or `xterm`).

> Note: For WSL2, ensure the distribution is upgraded (`wsl --set-version <distro> 2`) and that `/etc/wsl.conf` enables `systemd` when background services are needed.

## Migration Checklist (High-Level)

1. **Clone repository & adjust permissions**
   ```bash
   git clone git@github.com:marceloterra1983/TradingSystem.git ~/projetos/TradingSystem
   cd ~/projetos/TradingSystem
   chmod +x infrastructure/scripts/*.sh
   ```
2. **Install workstation prerequisites**
   ```bash
   sudo apt update
   sudo apt install -y git curl wget build-essential lsof net-tools
   ```
3. **Install Node.js via `nvm` (recommended)**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
   source ~/.bashrc
   nvm install --lts
   nvm use --lts
   ```
4. **Install Docker and add the current user to the `docker` group**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```
   Log out and log back in for the new group to take effect.
5. **Bootstrap project dependencies**
   ```bash
   ./infrastructure/scripts/setup-linux-environment.sh
   ```
   The script installs npm dependencies for the active services, copies `.env` templates, and creates required data folders.
6. **Configure service-specific `.env` files**
   - `frontend/apps/tp-capital/infrastructure/tp-capital-signals.env`
   - Additional secrets (Telegram, QuestDB) as needed.
7. **Verify scripts and containers run successfully**
   ```bash
   ./infrastructure/scripts/start-service-launcher.sh
   ./infrastructure/scripts/start-trading-system-dev.sh --start-monitoring
   ```

For a detailed step-by-step checklist with validation commands, see [ops/checklists/linux-setup](checklists/linux-setup.md).

## Key Bash Scripts

All cross-platform launcher scripts now live in `infrastructure/scripts/`.  
They supersede the legacy PowerShell tooling.

| Script | Purpose |
|--------|---------|
| `start-trading-system-dev.sh` | Boots the full dev stack (backend services, dashboard, docs, optional monitoring). |
| `start-service-launcher.sh` | Starts only the Laucher Node API on port `9999`. |
| `launch-service.sh` | Generic helper that spawns an individual Node/Poetry service in a detached terminal. |
| `setup-linux-environment.sh` | Installs npm dependencies, prepares data directories, and copies `.env` templates. |

Each script performs:

- Port availability checks (using `lsof`).
- Automatic npm install when `node_modules` is missing.
- Terminal auto-detection (`gnome-terminal`, `konsole`, `xterm`) with a fallback to background execution.
- Colored logs and exit codes for CI/local automation.

## Data & Volume Layout

```
data/
    database/
    keys/
    logs/
backend/api/
  tp-capital/
    logs/
  idea-bank/
    uploads/
  documentation-api/
    uploads/
```

- Maintain these directories under `$TRADING_SYSTEM_ROOT` (default `~/projetos/TradingSystem`).
- Back up `data/` and `.env` files regularly (example in [Backup](#backup-and-restore)).

## Optional: systemd User Services

To keep long-running services alive inside Linux/WSL:

1. Copy the unit files from `infrastructure/systemd/` to `~/.config/systemd/user/`.
2. Enable and start the services:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now tradingsystem-service-launcher
   systemctl --user enable --now tradingsystem-dashboard
   ```
3. Inspect logs with:
   ```bash
   journalctl --user -u tradingsystem-service-launcher -f
   ```

WSL2 requires the distribution to run with `systemd=true` (see Microsoft docs).

## Monitoring Stack (Linux Profile)

The observability stack (`infrastructure/monitoring/docker-compose.yml`) exposes an additional `linux` profile to activate `node-exporter`.

```bash
cd infrastructure/monitoring
COMPOSE_PROFILES=linux docker compose up -d
```

Access points:

- [Prometheus](http://localhost:9090)
- [Grafana](http://localhost:3000) (defaults `admin/admin`)
- [Alertmanager](http://localhost:9093)

## Backup and Restore

```bash
tar -czf ~/trading-system-backup-$(date +%Y%m%d).tar.gz \
  data/ \
  frontend/apps/tp-capital/infrastructure/tp-capital-signals.env
```

Restore by extracting the archive back into `$TRADING_SYSTEM_ROOT`.

## Troubleshooting Tips

| Issue | Resolution |
|-------|------------|
| Scripts refuse to execute | `chmod +x infrastructure/scripts/*.sh` |
| Docker requires `sudo` | `sudo usermod -aG docker $USER` and re-login |
| Ports already in use | `lsof -i :<PORT>` then `kill -9 <PID>` |
| npm install failures | Remove `node_modules` + `package-lock.json`, rerun `npm install` |

More scenarios live under `ops/troubleshooting/`.

## Related Documents

- [ops/checklists/linux-setup](checklists/linux-setup.md) — interactive setup checklist.
- `infrastructure/scripts/README.md`
- `LINUX-MIGRATION-SUMMARY.md` *(document located at the repository root for historical context)*
