# TradingSystem DevContainer

## Quick Setup

### Automated Setup (Recommended)
```bash
./setup-devcontainer-perfect.sh
```

### Manual Setup
1. Install Docker Desktop with WSL2 integration
2. Install Cursor/VSCode with DevContainers extension
3. Open project folder
4. Click "Reopen in Container"

## Service Ports

| Service | URL | Description |
|---------|-----|-------------|
| Dashboard | http://localhost:8090 | Main dashboard UI |
| API Gateway | http://localhost:9080 | Traefik reverse proxy |
| Traefik Dashboard | http://localhost:9081 | Gateway management |
| TP Capital | http://localhost:4005 | Trading system |
| RAG System | http://localhost:8202 | AI/LLM system |

## Environment

- Node.js: v20.19.5
- npm: 10.8.2
- Python: 3.12.12
- Docker: 29.0.0

## Quick Commands

- `start` - Start all services
- `stop` - Stop all services
- `npm-check` - Validate environment
- `dc` - Docker Compose shortcut
- `ll` - List files

## Troubleshooting

### Permission Issues
If you encounter EACCES errors:
```bash
sudo chown -R $(id -u):$(id -g) node_modules
```

### Rebuild Container
```bash
./setup-devcontainer-perfect.sh
```

### Reset Everything
```bash
docker compose down
rm -rf node_modules */node_modules
./setup-devcontainer-perfect.sh
```

## Architecture

This devcontainer uses:
- **Bind mounts** for node_modules (not named volumes)
- **Global pip** in container (no venv needed)
- **Docker-in-Docker** for managing stacks
- **Multi-stage setup** (post-create, post-start, post-attach)

## More Info

See: `STACKS.md` for stack documentation
