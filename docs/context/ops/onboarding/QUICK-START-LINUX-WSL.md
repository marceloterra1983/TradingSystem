---
title: Quick Start (Linux/WSL)
sidebar_position: 30
tags: [onboarding, linux, wsl, setup, environment]
domain: ops
type: guide
summary: Step-by-step onboarding path for running TradingSystem services from Linux or WSL2.
status: active
last_review: 2025-10-17
---

# Quick Start (Linux/WSL)

> ✅ Follow this guide when you want to spin up the documentation hub, dashboard, and auxiliary services from Ubuntu, Debian, or Windows Subsystem for Linux (WSL2).

## 1. Update Your Environment

Open your preferred Linux shell (Ubuntu 20.04+ recommended) and bring the OS up to date:

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Core Dependencies

Install Git, build tools, Python, and Node.js 20.x:

```bash
sudo apt install -y git build-essential python3 python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

> 💡 If you are using Docker Desktop on Windows, make sure **“Use the WSL 2 based engine”** is enabled so Docker commands executed from WSL can manage containers.

## 3. Clone the Repository

Create a workspace directory (for example `~/projects`), then clone the repo inside WSL:

```bash
git clone https://github.com/marceloterra/TradingSystem.git
cd TradingSystem
```

## 4. Bootstrap the Environment

Run the centralized environment setup and validation scripts, then install workspace dependencies:

```bash
bash scripts/env/setup-env.sh
bash scripts/env/validate-env.sh
npm install --workspaces
```

This ensures every service points to the shared `.env` file at the repository root.

## 5. Start Documentation & Dashboard

Launch the docs portal and dashboard in separate terminals:

```bash
# Terminal 1 – Docusaurus (Port 3004)
cd docs/docusaurus
npm run start -- --host 0.0.0.0 --port 3004
```

```bash
# Terminal 2 – Dashboard (Port 3103)
cd frontend/apps/dashboard
npm run dev -- --host 0.0.0.0 --port 3103
```

Both commands expose services on all interfaces so they are reachable from the Windows browser.

## 6. Optional: Bring Up Supporting Services

When you need QuestDB, Grafana, or other backend services, start the Docker Compose stacks from WSL:

```bash
bash infrastructure/scripts/start-all-stacks.sh
```

Stop them with `bash infrastructure/scripts/stop-all-stacks.sh` when finished.

## 7. Access the Portals

- Documentation Hub: [http://localhost:3004](http://localhost:3004)
- React Dashboard: [http://localhost:3103](http://localhost:3103)
- API Hub (within docs): [http://localhost:3004/shared/integrations/frontend-backend-api-hub](http://localhost:3004/shared/integrations/frontend-backend-api-hub)

> 🔄 For detailed service-by-service instructions, continue with [Start Services](./START-SERVICES.md) and the other onboarding guides in this directory.

---

**Troubleshooting Tips**

- If ports are already in use, stop previous dev servers or adjust the `--port` flag.
- Ensure Docker Desktop is running if you rely on containerized services.
- Re-run `bash scripts/env/validate-env.sh` whenever environment variables change.

