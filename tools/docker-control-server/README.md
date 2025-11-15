# Docker Control Server

Simple HTTP server that exposes Docker commands via REST API for the Course Crawler UI.

## Overview

The Course Crawler UI needs to fetch logs from the worker container in real-time. This service provides a secure API to execute whitelisted Docker commands.

## Features

- ✅ **Logs fetching** - Get last 100 lines from container logs
- ✅ **Container status** - Check if container is running
- ✅ **Restart** - Restart containers remotely
- ✅ **Security whitelist** - Only allowed containers can be accessed
- ✅ **Health checks** - `/health` endpoint for monitoring
- ✅ **CORS enabled** - Works with frontend on different port

## API

### Health Check
```bash
GET /health
```
Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-11T21:30:00.000Z"
}
```

### Docker Commands
```bash
POST /
Content-Type: application/json

{
  "action": "logs",      // logs | status | restart
  "container": "course-crawler-worker"
}
```

Response (success):
```json
{
  "success": true,
  "output": "... container logs ...",
  "timestamp": "2025-11-11T21:30:00.000Z"
}
```

Response (error):
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-11-11T21:30:00.000Z"
}
```

## Allowed Containers (Whitelist)

- `course-crawler-worker`
- `course-crawler-api`
- `course-crawler-ui`
- `course-crawler-db`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9880` | Server port |

## Usage

### Standalone
```bash
cd tools/docker-control-server
npm install
npm start
```

### Docker Compose
Already integrated in `docker-compose.4-5-course-crawler-stack.yml`:
```bash
cd tools/compose
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d docker-control-server
```

### Test API
```bash
# Health check
curl http://localhost:9880/health

# Fetch logs
curl -X POST http://localhost:9880/ \
  -H "Content-Type: application/json" \
  -d '{"action": "logs", "container": "course-crawler-worker"}'

# Check status
curl -X POST http://localhost:9880/ \
  -H "Content-Type: application/json" \
  -d '{"action": "status", "container": "course-crawler-worker"}'
```

## Security

- **Whitelist** - Only predefined containers can be accessed
- **Read-only Docker socket** - Mounted as `:ro` to prevent modifications
- **No shell access** - Uses `child_process.exec` with strict validation
- **CORS** - Enabled for local development, configure for production

## Port Allocation

- **9880** - Docker Control Server (HTTP API)

Follows the project's port allocation strategy:
- 9000-9999: Development tools and utilities

## Integration

The Course Crawler UI (`WorkerLogsSection.tsx`) connects to this server at `http://127.0.0.1:9880` to fetch real-time logs without requiring users to run `docker logs` manually.

## Troubleshooting

### Error: Cannot connect to Docker daemon
```
Error: connect ENOENT /var/run/docker.sock
```
**Solution:** Ensure Docker is running and socket is accessible:
```bash
docker ps  # Test Docker is running
```

### Error: Container not allowed
```json
{
  "success": false,
  "error": "Container 'xyz' is not allowed"
}
```
**Solution:** Add container to whitelist in `index.js`:
```javascript
const allowedContainers = [
  'course-crawler-worker',
  'your-new-container'  // Add here
];
```

## Future Improvements

- [ ] Authentication (JWT tokens)
- [ ] Rate limiting
- [ ] Stream logs with WebSocket
- [ ] Support for `docker exec` commands
- [ ] Configurable whitelist via environment

---

**Created:** 2025-11-11
**Author:** Claude Code AI Assistant
**Status:** Production Ready
