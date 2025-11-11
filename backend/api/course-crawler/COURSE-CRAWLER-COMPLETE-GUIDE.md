# 📚 Course Crawler Stack - Complete Guide

## ✅ Status: FULLY OPERATIONAL

**Last Updated:** 2025-11-11
**Version:** 1.0.0
**Status:** ✅ All services healthy and operational

---

## 🎯 Overview

Course Crawler Stack is a complete web scraping solution for educational content with:
- **PostgreSQL 15** database with automatic schema initialization
- **Express REST API** with JWT authentication and circuit breakers
- **Background Worker** for async job processing
- **React Frontend** with NGINX serving

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Course Crawler Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Frontend   │──▶│     API      │──▶│   Database   │    │
│  │   (React)    │   │  (Express)   │   │ (PostgreSQL) │    │
│  │   :4201      │   │    :3601     │   │    :55433    │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                            │                                 │
│                            ▼                                 │
│                     ┌──────────────┐                        │
│                     │    Worker    │                        │
│                     │  (Background │                        │
│                     │     Jobs)    │                        │
│                     └──────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 2GB+ RAM available
- Ports available: 3601, 4201, 55433

### Start Stack

```bash
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d
```

**Wait 30-40 seconds** for health checks to complete.

### Verify Status

```bash
docker ps --filter "name=course-crawler"
```

Expected output - all containers with STATUS starting with "Up":
```
NAMES                   STATUS          PORTS
course-crawler-ui       Up (healthy)    0.0.0.0:4201->80/tcp
course-crawler-api      Up (healthy)    0.0.0.0:3601->3601/tcp
course-crawler-worker   Up (healthy)
course-crawler-db       Up (healthy)    0.0.0.0:55433->5432/tcp
```

---

## 🧪 Testing

### 1. API Health Check
```bash
curl http://localhost:3601/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 45.5,
  "worker": {
    "isRunning": true,
    "activeRunsCount": 0
  }
}
```

### 2. Authentication Test
```bash
curl -X POST http://localhost:3601/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}' | jq .
```

Expected response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "admin-001",
    "username": "admin"
  }
}
```

### 3. Metrics Endpoint
```bash
curl http://localhost:3601/metrics
```

Returns Prometheus-format metrics.

### 4. Frontend UI
Open in browser: http://localhost:4201

### 5. Database Connection
```bash
docker exec -it course-crawler-db psql -U postgres -d coursecrawler
```

---

## 📊 Monitoring & Observability

### Health Checks

All containers have health checks configured:

| Container | Check Type | Interval | Timeout |
|-----------|------------|----------|---------|
| Database  | `pg_isready` | 10s | 5s |
| API       | HTTP GET /health | 30s | 10s |
| Worker    | Process check | 30s | 5s |
| Frontend  | HTTP GET / | 30s | 5s |

### View Logs

```bash
# API logs
docker logs course-crawler-api -f

# Worker logs
docker logs course-crawler-worker -f

# Database logs
docker logs course-crawler-db -f

# All logs together
docker compose -f docker-compose.4-5-course-crawler-stack.yml logs -f
```

### Prometheus Metrics

Available at: `http://localhost:3601/metrics`

Key metrics:
- `course_crawler_active_runs` - Currently running jobs
- `course_crawler_classes_processed_total` - Total classes processed
- `http_request_duration_seconds` - API request latency
- `database_pool_size` - Database connection pool size

---

## 🗄️ Database Management

### Automatic Schema Initialization

Schema is automatically created on first startup via:
`backend/api/course-crawler/scripts/init-schema.sql`

Tables created:
- `course_crawler.courses` - Course configurations
- `course_crawler.crawl_runs` - Job execution history

### Manual Schema Creation

If needed:
```bash
docker exec -it course-crawler-db psql -U postgres -d coursecrawler -f /docker-entrypoint-initdb.d/01-init-schema.sql
```

### Backup Database

```bash
docker exec course-crawler-db pg_dump -U postgres coursecrawler > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
docker exec -i course-crawler-db psql -U postgres -d coursecrawler < backup_file.sql
```

---

## 🔐 Security Configuration

### Default Credentials (⚠️ Change in Production!)

```bash
# Admin User
Username: admin
Password: changeme

# Database
User: postgres
Password: coursecrawler
```

### Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

**MUST CHANGE:**
- `COURSE_CRAWLER_ENCRYPTION_KEY` (32+ chars)
- `COURSE_CRAWLER_JWT_SECRET` (32+ chars)
- `COURSE_CRAWLER_ADMIN_PASSWORD`
- `COURSE_CRAWLER_DB_PASSWORD`

---

## 🛠️ Troubleshooting

### Problem: Container unhealthy

**Check logs:**
```bash
docker logs <container-name>
```

**Restart container:**
```bash
docker compose -f docker-compose.4-5-course-crawler-stack.yml restart <service-name>
```

### Problem: Database connection errors

**Verify database is healthy:**
```bash
docker exec course-crawler-db pg_isready -U postgres
```

**Check network connectivity:**
```bash
docker exec course-crawler-api ping -c 3 course-crawler-db
```

### Problem: TypeScript compilation errors

**Rebuild after code changes:**
```bash
cd backend/api/course-crawler
npm run build
```

**Then rebuild container:**
```bash
docker compose -f ../../tools/compose/docker-compose.4-5-course-crawler-stack.yml up -d --build course-crawler-api
```

### Problem: Port already in use

**Find process using port:**
```bash
lsof -i :3601  # or 4201, 55433
```

**Kill process or change port in compose file.**

---

## 📝 API Reference

### Authentication

**POST /auth/login**
```bash
curl -X POST http://localhost:3601/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme"}'
```

**POST /auth/verify**
```bash
curl -X POST http://localhost:3601/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health & Metrics

**GET /health**
```bash
curl http://localhost:3601/health
```

**GET /metrics**
```bash
curl http://localhost:3601/metrics
```

### Courses (Protected)

Requires JWT token in `Authorization: Bearer <token>` header.

**GET /api/v1/courses**
**POST /api/v1/courses**
**GET /api/v1/courses/:id**
**PUT /api/v1/courses/:id**
**DELETE /api/v1/courses/:id**

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Course Crawler Stack Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start Stack
        run: |
          cd tools/compose
          docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d

      - name: Wait for Health
        run: |
          timeout 60 bash -c 'until docker ps --filter "name=course-crawler-api" --filter "health=healthy" | grep -q course-crawler-api; do sleep 2; done'

      - name: Run Tests
        run: |
          curl -f http://localhost:3601/health || exit 1
```

---

## 📚 Additional Resources

- **API Documentation**: See [backend/api/course-crawler/README.md](README.md)
- **TypeScript Guide**: [backend/api/course-crawler/src/](src/)
- **Frontend**: [frontend/course-crawler/](../../../frontend/course-crawler/)
- **Compose File**: [tools/compose/docker-compose.4-5-course-crawler-stack.yml](../../tools/compose/docker-compose.4-5-course-crawler-stack.yml)

---

## 🎉 Success Indicators

✅ All 4 containers running
✅ All health checks passing
✅ API responding to /health
✅ JWT authentication working
✅ Database schema initialized
✅ Worker polling for jobs
✅ Frontend serving on port 4201
✅ Prometheus metrics available

**Your stack is ready for development!** 🚀
