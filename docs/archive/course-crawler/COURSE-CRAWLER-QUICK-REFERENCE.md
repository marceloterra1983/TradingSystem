# 🚀 Course Crawler Stack - Quick Reference

**Stack Name:** `4-5-course-crawler-stack`
**Version:** 1.0.0
**Status:** ✅ Production Ready

---

## 📍 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **UI** | http://localhost:4201 | React frontend for course management |
| **API** | http://localhost:3601 | REST API for courses and crawling |
| **Worker** | http://localhost:3602 | Background crawler processor |
| **Database** | localhost:5434 | TimescaleDB (user: `postgres`, db: `coursecrawler`) |

---

## ⚡ Quick Commands

### Start Stack
```bash
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d
```

### Stop Stack
```bash
docker compose -f docker-compose.4-5-course-crawler-stack.yml down
```

### View Logs
```bash
# All containers
docker compose -f docker-compose.4-5-course-crawler-stack.yml logs -f

# Specific container
docker logs -f course-crawler-api
docker logs -f course-crawler-worker
docker logs -f course-crawler-ui
```

### Check Health
```bash
docker ps --filter "label=com.docker.compose.project=4-5-course-crawler-stack"
```

### Rebuild (After Code Changes)
```bash
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d --build
```

---

## 🗄️ Database Access

### Connect via psql
```bash
docker exec -it course-crawler-db psql -U postgres -d coursecrawler
```

### Common Queries
```sql
-- List all courses
SELECT id, name, base_url, username, target_urls, created_at
FROM course_crawler.courses
ORDER BY created_at DESC;

-- Count courses
SELECT COUNT(*) FROM course_crawler.courses;

-- View crawler runs
SELECT id, course_id, status, progress, started_at, completed_at
FROM course_crawler.runs
ORDER BY started_at DESC LIMIT 10;

-- Delete test courses
DELETE FROM course_crawler.courses WHERE name LIKE 'Test%';
```

---

## 🔐 Authentication

### JWT Token (Stored in `/tmp/cc_token.txt`)
```bash
TOKEN=$(cat /tmp/cc_token.txt | tr -d '\n')
```

### API Request Example
```bash
curl -X GET http://localhost:3601/courses \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 API Endpoints

### Courses
```bash
# List all courses
GET /courses

# Get single course
GET /courses/:id

# Create course
POST /courses
{
  "name": "Course Name",
  "baseUrl": "https://example.com",
  "username": "user",
  "password": "pass"
  // targetUrls optional - defaults to [baseUrl]
}

# Update course
PUT /courses/:id
{
  "name": "Updated Name"
}

# Delete course
DELETE /courses/:id
```

### Crawler Runs
```bash
# List all runs
GET /runs

# Get single run
GET /runs/:id

# Trigger manual crawl
POST /runs
{
  "courseId": "course-uuid"
}

# Stop run
POST /runs/:id/stop
```

### Health & Stats
```bash
# Health check
GET /health

# Statistics
GET /stats
```

---

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker logs course-crawler-api

# Remove old containers
docker rm -f course-crawler-db course-crawler-api course-crawler-worker course-crawler-ui

# Recreate
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d
```

### Database connection issues
```bash
# Verify database is running
docker exec course-crawler-db pg_isready

# Check connection from API
docker exec course-crawler-api nc -zv course-crawler-db 5432
```

### Port conflicts
```bash
# Find process using port
sudo lsof -i :3601
sudo lsof -i :4201

# Kill process
kill -9 <PID>
```

### API not responding
```bash
# Check API health
curl http://localhost:3601/health

# Restart API
docker restart course-crawler-api

# View API logs
docker logs -f course-crawler-api
```

---

## 🔧 Environment Variables

**Location:** `/home/marce/Projetos/TradingSystem/.env`

**Key Variables:**
```bash
# =============================================================================
# 4-5-COURSE-CRAWLER-STACK
# =============================================================================

COURSE_CRAWLER_MAX_CLASSES_PER_MODULE=50
COURSE_CRAWLER_ENCRYPTION_KEY=course_crawler_secret_key_32chars_minimum_required_here
```

**After changes:**
```bash
# Validate
bash scripts/env/validate-env.sh

# Rebuild containers
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d --build
```

---

## 📊 Monitoring

### Container Health
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Resource Usage
```bash
docker stats --no-stream course-crawler-db course-crawler-api course-crawler-worker course-crawler-ui
```

### Disk Space
```bash
docker system df
```

---

## 🧪 Testing

### Test Course Creation
```bash
# Run test script
bash .claude/sudo-scripts/test-course-creation.sh
```

### Manual API Test
```bash
TOKEN=$(cat /tmp/cc_token.txt | tr -d '\n')

curl -X POST http://localhost:3601/courses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Course",
    "baseUrl": "https://example.com",
    "username": "testuser",
    "password": "testpass"
  }' | jq .
```

### Verify in Database
```bash
docker exec course-crawler-db psql -U postgres -d coursecrawler -c \
  "SELECT name, base_url, target_urls FROM course_crawler.courses ORDER BY created_at DESC LIMIT 1;"
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [COURSE-CRAWLER-SESSION-SUMMARY.md](COURSE-CRAWLER-SESSION-SUMMARY.md) | Complete session summary |
| [COURSE-CRAWLER-BUG-FIX-COMPLETE.md](COURSE-CRAWLER-BUG-FIX-COMPLETE.md) | Bug fix details |
| [COURSE-CRAWLER-FORM-FIX.md](COURSE-CRAWLER-FORM-FIX.md) | Bug analysis |
| [ENV-REORGANIZATION-SUMMARY.md](ENV-REORGANIZATION-SUMMARY.md) | Environment variables |
| [FINAL-VALIDATION-REPORT.md](FINAL-VALIDATION-REPORT.md) | Validation report |

---

## 🎯 Common Workflows

### Daily Startup
```bash
# 1. Start stack
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d

# 2. Verify health
docker ps --filter "label=com.docker.compose.project=4-5-course-crawler-stack"

# 3. Access UI
# Open http://localhost:4201 in browser
```

### Deploy Changes
```bash
# 1. Make code changes in backend/api/course-crawler/

# 2. Rebuild API
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d --build course-crawler-api

# 3. Verify
curl http://localhost:3601/health

# 4. Test UI
# Open http://localhost:4201
```

### Backup Database
```bash
# Dump database
docker exec course-crawler-db pg_dump -U postgres coursecrawler > backup.sql

# Restore
docker exec -i course-crawler-db psql -U postgres coursecrawler < backup.sql
```

---

## 🚨 Emergency Procedures

### Total Reset
```bash
# 1. Stop and remove everything
docker compose -f docker-compose.4-5-course-crawler-stack.yml down -v

# 2. Remove all containers
docker rm -f course-crawler-db course-crawler-api course-crawler-worker course-crawler-ui

# 3. Recreate from scratch
docker compose -f docker-compose.4-5-course-crawler-stack.yml up -d
```

### Database Reset
```bash
# 1. Backup first!
docker exec course-crawler-db pg_dump -U postgres coursecrawler > backup_$(date +%Y%m%d).sql

# 2. Drop and recreate
docker exec course-crawler-db psql -U postgres -c "DROP DATABASE coursecrawler;"
docker exec course-crawler-db psql -U postgres -c "CREATE DATABASE coursecrawler;"

# 3. Restart API (will run migrations)
docker restart course-crawler-api
```

---

## ✅ Health Checklist

Before deploying to production:

- [ ] All 4 containers are healthy
- [ ] API health endpoint responds
- [ ] UI is accessible
- [ ] Can create a test course
- [ ] Database is accessible
- [ ] Environment variables validated
- [ ] No port conflicts
- [ ] Logs show no errors
- [ ] Tests pass
- [ ] Documentation is up-to-date

---

**Last Updated:** 2025-11-11 19:06 UTC
**Maintained By:** TradingSystem Team
**Stack Version:** 1.0.0
