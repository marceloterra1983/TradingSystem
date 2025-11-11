# 🐳 TradingSystem Dev Container

**Complete development environment in a container - Part of Phase 1.5**

## 📋 Overview

This Dev Container provides a fully configured development environment for TradingSystem, eliminating "works on my machine" issues and ensuring consistency across all developers.

## ✨ Features

### 🔧 Pre-installed Tools

- **Node.js 20 LTS** - Matches CI environment
- **Python 3.12** - Latest stable version
- **Docker-in-Docker** - Run Docker commands inside the container
- **Git** - With credential helper
- **GitHub CLI (gh)** - For PR management
- **Zsh + Oh My Zsh** - Enhanced terminal experience

### 📦 Global Packages

**Node.js:**
- npm, pnpm, yarn
- TypeScript, ts-node
- ESLint, Prettier
- Nodemon, PM2

**Python:**
- black, flake8, pylint, mypy
- pytest, ipython

### 🎨 VS Code Extensions

**Essential:**
- ESLint, Prettier
- TypeScript
- Docker
- GitLens

**Frontend:**
- React snippets
- Tailwind CSS
- Vitest Explorer

**Python:**
- Python, Pylance

**Documentation:**
- Markdown All in One
- PlantUML

## 🚀 Getting Started

### Prerequisites

1. **VS Code** with **Dev Containers extension**
   ```bash
   code --install-extension ms-vscode-remote.remote-containers
   ```

2. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   ```bash
   docker --version  # Should be 20.10+ or later
   ```

### First Time Setup

1. **Open in Container**
   - Open project in VS Code
   - Command Palette (`Ctrl+Shift+P`)
   - Select: **"Dev Containers: Reopen in Container"**

2. **Wait for Setup** (first time: 10-15 minutes)
   - Container build (5-8 min)
   - Dependencies installation (5-7 min)
   - Post-create scripts (automatic)

3. **Verify Setup**
   ```bash
   node --version   # Should show v20.x.x
   npm --version    # Should show 10.x.x
   python3 --version # Should show 3.12.x
   docker --version # Should show 28.x.x
   ```

4. **Configure Environment**
   ```bash
   # Create .env from example
   cp .env.example .env

   # Edit .env with your values
   nano .env

   # Validate configuration
   npm run env:validate
   ```

5. **Start Services**
   ```bash
   npm run start  # or just: start
   ```

### Daily Usage

**Start Container:**
```bash
# VS Code: Command Palette → "Dev Containers: Reopen in Container"
# Or: Click "Reopen in Container" notification
```

**Stop Container:**
```bash
# VS Code: Command Palette → "Dev Containers: Close Remote Connection"
# Or: File → Close Remote Connection
```

## 🔄 Lifecycle Scripts

### `post-create.sh` (Runs Once)

Executed after container is created:
1. Install all npm dependencies (root, dashboard, docs)
2. Setup Python virtual environment
3. Install Python dependencies
4. Configure Git hooks (husky)
5. Create .env from .env.example (if needed)
6. Validate environment
7. Build TypeScript projects
8. Generate commands/agents databases

### `post-start.sh` (Runs on Start)

Executed every time container starts:
1. Check Docker daemon
2. Activate Python venv
3. Check .env file
4. Check port availability
5. Display environment status

### `post-attach.sh` (Runs on Attach)

Executed when terminal is attached:
1. Display welcome message
2. Show environment info
3. List useful commands
4. Show service ports
5. Activate Python venv

## 🛠️ Development Workflow

### Common Tasks

**Start All Services:**
```bash
npm run start        # Force kill + start
npm run start:soft   # Start without killing
```

**Stop All Services:**
```bash
npm run stop         # Stop all
npm run stop:all     # Stop + prune networks
```

**Environment Management:**
```bash
npm run env:validate # Validate .env
nano .env            # Edit .env
```

**Linting & Type Checking:**
```bash
npm run lint         # Lint code
npm run lint:fix     # Auto-fix issues
npm run type-check   # Type check all
```

**Building:**
```bash
npm run build        # Parallel build
npm run build:clean  # Clean + build
```

**Testing:**
```bash
cd frontend/dashboard && npm run test        # Unit tests
cd frontend/dashboard && npm run test:coverage # With coverage
```

### Docker Commands

**List Containers:**
```bash
docker ps                    # Running containers
docker ps -a                 # All containers
dc ps                        # Using alias
```

**Manage Stacks:**
```bash
cd tools/compose
docker compose -f docker-compose.1-dashboard-stack.yml up -d
docker compose -f docker-compose.2-docs-stack.yml up -d
```

**View Logs:**
```bash
docker logs -f <container-name>
docker compose logs -f
```

### Python Development

**Activate venv:**
```bash
source venv/bin/activate     # Manual activation
# Or just open a new terminal (auto-activates)
```

**Install Dependencies:**
```bash
pip install -r requirements.txt
pip install <package-name>
pip freeze > requirements.txt  # Update requirements
```

**Run Scripts:**
```bash
python scripts/docs/validate-frontmatter.py
python scripts/rag/ingest-documents.py
```

## 📁 File Structure

```
.devcontainer/
├── devcontainer.json        # Container configuration
├── docker-compose.yml       # Container orchestration
├── Dockerfile               # Custom image definition
├── scripts/
│   ├── post-create.sh      # Initial setup
│   ├── post-start.sh       # Startup tasks
│   └── post-attach.sh      # Terminal attach tasks
└── README.md               # This file
```

## 🔌 Port Forwarding

Ports are automatically forwarded to your host machine:

| Service | Port | URL |
|---------|------|-----|
| **Dashboard** | 3103 | http://localhost:3103 |
| **Documentation** | 3404 | http://localhost:3404 |
| **Workspace API** | 3200 | http://localhost:3200 |
| **TP Capital** | 4005 | http://localhost:4005 |
| **Documentation API** | 3405 | http://localhost:3405 |
| **Firecrawl Proxy** | 3600 | http://localhost:3600 |
| **RAG System** | 8202 | http://localhost:8202 |
| **PostgreSQL** | 5432 | localhost:5432 |
| **Redis** | 6379 | localhost:6379 |
| **RabbitMQ** | 5672/15672 | localhost:5672/15672 |
| **Prometheus** | 9090 | http://localhost:9090 |
| **Grafana** | 3100 | http://localhost:3100 |

## 🎨 VS Code Integration

### Extensions

All extensions are automatically installed. To add more:

1. Edit `.devcontainer/devcontainer.json`
2. Add extension ID to `customizations.vscode.extensions`
3. Rebuild container: **"Dev Containers: Rebuild Container"**

### Settings

Settings are pre-configured for:
- Auto-format on save (Prettier)
- ESLint auto-fix on save
- TypeScript strict mode
- Python formatting (Black)
- Docker socket access
- Git auto-fetch

### Terminal

**Default Shell:** Zsh with Oh My Zsh

**Aliases:**
- `ll` - ls -alh
- `dc` - docker compose
- `npm-check` - npm run env:validate
- `start` - npm run start
- `stop` - npm run stop

## 🐛 Troubleshooting

### Container Won't Start

**Problem:** Container fails to build or start

**Solutions:**
```bash
# 1. Rebuild container
# Command Palette → "Dev Containers: Rebuild Container"

# 2. Clean Docker resources
docker system prune -a
docker volume prune

# 3. Check Docker daemon
sudo service docker start  # Linux
# Restart Docker Desktop     # Windows/Mac

# 4. Check logs
# VS Code → View → Output → Dev Containers
```

### Port Already in Use

**Problem:** Port 3103/3404/etc. already in use

**Solutions:**
```bash
# 1. Find process using port
lsof -i :3103
netstat -tuln | grep 3103

# 2. Kill process
kill -9 <PID>

# 3. Or use different port in .env
DASHBOARD_PORT=3104
DOCS_PORT=3405
```

### Docker-in-Docker Not Working

**Problem:** Docker commands fail inside container

**Solutions:**
```bash
# 1. Check Docker socket
ls -la /var/run/docker.sock
sudo chmod 666 /var/run/docker.sock

# 2. Verify Docker daemon
docker info

# 3. Restart Docker service
sudo service docker restart

# 4. Rebuild with privileged mode (already configured)
```

### Python venv Not Activated

**Problem:** Python packages not found

**Solutions:**
```bash
# 1. Manual activation
source /workspace/venv/bin/activate

# 2. Or recreate venv
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Check post-attach.sh runs
cat .devcontainer/scripts/post-attach.sh
```

### Node Modules Missing

**Problem:** npm packages not found

**Solutions:**
```bash
# 1. Re-run post-create
bash .devcontainer/scripts/post-create.sh

# 2. Or install manually
npm ci                              # Root
cd frontend/dashboard && npm ci     # Dashboard
cd docs && npm ci                   # Docs

# 3. Check node_modules volume
docker volume ls | grep node-modules
```

### Git Credentials Not Working

**Problem:** Git push/pull requires credentials

**Solutions:**
```bash
# 1. Configure Git (already mounted from host)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 2. Setup GitHub CLI
gh auth login

# 3. Use SSH (recommended)
# Add SSH key to GitHub
# Mount ~/.ssh (already configured)
```

## 🔐 Security

### Mounted Volumes

**Safe to Mount:**
- ✅ Project directory (`..:/workspace`)
- ✅ Git config (`~/.gitconfig`)
- ✅ SSH keys (`~/.ssh`)
- ✅ Docker socket (for Docker-in-Docker)

**Never Mount:**
- ❌ Entire home directory
- ❌ System directories
- ❌ Sensitive credential files (beyond SSH/Git)

### Privileged Mode

Container runs in privileged mode for Docker-in-Docker. This is required but has security implications:

- ✅ **Safe for local development**
- ⚠️ **Not for production/shared environments**
- ✅ **Isolated from host by Docker**

## 📊 Performance

### Tips for Best Performance

1. **Use Named Volumes** (already configured)
   ```yaml
   volumes:
     - node-modules:/workspace/node_modules
   ```

2. **Exclude from File Watcher**
   ```json
   "files.watcherExclude": {
     "**/node_modules/**": true
   }
   ```

3. **Allocate Enough Resources**
   - Docker Desktop → Settings → Resources
   - **CPU:** 4+ cores
   - **Memory:** 8GB+ RAM
   - **Disk:** 50GB+ available

4. **Use SSD for Docker Storage**

## 🆘 Support

### Documentation

- **Project Docs:** `docs/README.md`
- **Claude Instructions:** `CLAUDE.md`
- **Quick Start:** `README.md`

### Common Issues

- [Container won't start](#container-wont-start)
- [Port conflicts](#port-already-in-use)
- [Docker-in-Docker issues](#docker-in-docker-not-working)
- [Python venv problems](#python-venv-not-activated)

### Getting Help

1. Check [Troubleshooting](#-troubleshooting)
2. Review VS Code Output → Dev Containers
3. Check Docker logs: `docker logs <container-id>`
4. Ask in project Slack/Discord

## 📚 References

### Official Documentation

- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Docker-in-Docker](https://github.com/microsoft/vscode-dev-containers/tree/main/script-library/docs)
- [Dev Container Features](https://containers.dev/features)

### TradingSystem Docs

- [Environment Setup](../docs/content/tools/development/environment-setup.mdx)
- [Development Workflow](../docs/content/tools/development/workflow-guide.mdx)
- [CI/CD Pipeline](../docs/content/tools/ci-cd/pipeline-guide.mdx)

---

**Last Updated:** 2025-11-11
**Version:** 1.0 (Phase 1.5 Implementation)
**Maintainer:** TradingSystem Team
