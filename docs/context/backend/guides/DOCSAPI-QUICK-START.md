---
title: Documentation API Quick Start
sidebar_position: 10
tags: [backend, api, documentation, quick-start, guide]
domain: backend
type: guide
summary: Quick start guide for Documentation API setup, configuration, and basic usage
status: active
last_review: 2025-10-17
---

# 🚀 DocsAPI - Quick Start Guide

> **Get DocsAPI running in Docker in 2 minutes**

---

## ⚡ Fastest Way

```bash
# One command to rule them all
bash scripts/docker/migrate-docs-to-docker.sh
```

This will:

1. ✅ Backup your current data
2. ✅ Stop local services
3. ✅ Start TimescaleDB
4. ✅ Build Docker image
5. ✅ Start DocsAPI container
6. ✅ Run validation tests

---

## 🎯 Manual Method

### Step 1: Start TimescaleDB

```bash
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d timescaledb
```

### Step 2: Start DocsAPI

```bash
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d docs-api
```

### Step 3: Verify

```bash
curl http://localhost:3400/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "documentation-api",
  "database": "healthy"
}
```

---

## 🧪 Test Everything

```bash
bash scripts/docker/test-docs-api.sh
```

---

## 📊 Check Status

```bash
bash scripts/docker/check-docs-services.sh
```

---

## 🔗 Important URLs

- **DocsAPI:** http://localhost:3400
- **Health:** http://localhost:3400/health
- **OpenAPI:** http://localhost:3400/spec/openapi.yaml
- **AsyncAPI:** http://localhost:3400/spec/asyncapi.yaml
- **Systems API:** http://localhost:3400/api/v1/systems

---

## 🆘 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose -f infrastructure/compose/docker-compose.docs.yml logs docs-api

# Rebuild
docker compose -f infrastructure/compose/docker-compose.docs.yml build --no-cache docs-api
docker compose -f infrastructure/compose/docker-compose.docs.yml up -d docs-api
```

### TimescaleDB connection error

```bash
# Ensure TimescaleDB is running
docker ps | grep data-timescaledb

# If not, start it
docker compose -f infrastructure/compose/docker-compose.timescale.yml up -d timescaledb
```

### Port 3400 already in use

```bash
# Kill local service
lsof -i :3400
kill -9 <PID>
```

---

## 📚 Full Documentation

See complete guides:

- **Migration Guide:** `docs/DOCS-SERVICES-DOCKER-MIGRATION.md`
- **DocsAPI README:** `backend/api/documentation-api/README.md`
- **Migration Summary:** `MIGRATION-SUMMARY.md`

---

**🎉 That's it! DocsAPI is now containerized and ready to use.**
