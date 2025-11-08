---
title: WhatsApp Gateway Stack
description: Complete WhatsApp message storage and synchronization system
tags: [whatsapp, gateway, timescaledb, messaging, sync]
domain: apps
type: documentation
summary: Full-featured WhatsApp Gateway with TimescaleDB storage, MinIO media management, and automatic message synchronization
status: active
last_review: "2025-11-08"
---

# WhatsApp Gateway Stack

Complete WhatsApp message storage and synchronization system, similar to the Telegram Stack architecture.

## 📋 Overview

The WhatsApp Gateway Stack provides:

- ✅ **Full message persistence** - All messages stored in TimescaleDB
- ✅ **Media storage** - Images, videos, documents in MinIO (S3-compatible)
- ✅ **Automatic synchronization** - Background service for message sync
- ✅ **Contact management** - Track contacts, groups, and participants
- ✅ **Session management** - Multiple WhatsApp sessions support
- ✅ **Webhook integration** - Real-time message processing
- ✅ **RESTful API** - Query messages, contacts, and media

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    WhatsApp Gateway Stack                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ WhatsApp Core│  │ Gateway API  │  │ Sync Service │           │
│  │   (WAHA)     │  │  (Express)   │  │  (Worker)    │           │
│  │  Port 3311   │  │  Port 4011   │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
│         ┌─────────────────┴─────────────────┐                   │
│         │                                    │                   │
│   ┌─────▼──────┐                      ┌─────▼──────┐            │
│   │ TimescaleDB│◄────────────────────►│   Redis    │            │
│   │   +         │                      │   Cache    │            │
│   │ PgBouncer  │                      │            │            │
│   │ Port 5435  │                      │ Port 6380  │            │
│   └────────────┘                      └────────────┘            │
│                                                                   │
│                    ┌──────────────┐                              │
│                    │    MinIO     │                              │
│                    │ (S3 Storage) │                              │
│                    │ Port 9302/03 │                              │
│                    └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Real-time messages** → WhatsApp Core → Webhook → Gateway API → TimescaleDB
2. **Background sync** → Sync Service → WhatsApp Core API → Gateway API → TimescaleDB
3. **Media files** → Download → MinIO → Thumbnail generation
4. **Queries** → Gateway API → TimescaleDB (via PgBouncer) → Response

## 🚀 Quick Start

### Prerequisites

Add to your `.env` file:

```bash
# WhatsApp Database
WHATSAPP_DB_USER=whatsapp
WHATSAPP_DB_PASSWORD=your-secure-password-here
WHATSAPP_DB_PORT=5435
WHATSAPP_PGBOUNCER_PORT=6435

# WhatsApp Core (WAHA)
WHATSAPP_CORE_PORT=3311
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_DASHBOARD_ENABLED=true
WHATSAPP_DASHBOARD_USERNAME=admin
WHATSAPP_DASHBOARD_PASSWORD=your-dashboard-password

# Gateway API
WHATSAPP_GATEWAY_API_PORT=4011
WHATSAPP_GATEWAY_API_TOKEN=your-api-token-here
WHATSAPP_WEBHOOK_TOKEN=your-webhook-token-here

# Redis
WHATSAPP_REDIS_PORT=6380
WHATSAPP_REDIS_ENABLED=true

# MinIO
WHATSAPP_MINIO_API_PORT=9302
WHATSAPP_MINIO_CONSOLE_PORT=9303
WHATSAPP_MINIO_ROOT_USER=whatsappadmin
WHATSAPP_MINIO_ROOT_PASSWORD=your-minio-password
WHATSAPP_MINIO_BUCKET=whatsapp-media

# Sync Settings
WHATSAPP_SYNC_ENABLED=true
WHATSAPP_SYNC_INTERVAL_MS=300000  # 5 minutes
WHATSAPP_SYNC_BATCH_SIZE=100
WHATSAPP_SYNC_LOOKBACK_DAYS=7
```

### Start the Stack

```bash
# Using the startup script
bash scripts/whatsapp/start-stack.sh

# Or manually with Docker Compose
docker compose -f tools/compose/docker-compose.whatsapp.yml up -d
```

### Create a Session

1. Access WhatsApp Core dashboard: `http://localhost:3311/dashboard`
2. Login with `WHATSAPP_DASHBOARD_USERNAME` / `WHATSAPP_DASHBOARD_PASSWORD`
3. Create a new session (e.g., "main")
4. Scan the QR code with your WhatsApp mobile app
5. Wait for connection status to show "Connected"

### Verify Setup

```bash
# Run health check
bash scripts/whatsapp/health-check.sh

# View logs
docker compose -f tools/compose/docker-compose.whatsapp.yml logs -f

# Check database
docker exec -it whatsapp-timescale psql -U whatsapp -d whatsapp_gateway

# Query messages
docker exec whatsapp-timescale psql -U whatsapp -d whatsapp_gateway \
  -c "SELECT COUNT(*) FROM whatsapp_gateway.messages;"
```

## 📊 Database Schema

### Tables

1. **`sessions`** - WhatsApp session tracking
2. **`contacts`** - Contact and group information
3. **`messages`** - All messages (TimescaleDB hypertable)
4. **`media_downloads`** - Media download tracking
5. **`sync_state`** - Synchronization state per chat

### Key Features

- **Hypertable partitioning** - Messages partitioned by day
- **Continuous aggregates** - Hourly message statistics
- **Retention policy** - Automatic cleanup after 365 days
- **Full-text search** - Portuguese language support
- **JSONB fields** - Flexible metadata storage

## 🔄 Synchronization

The Sync Service automatically:

1. Queries the `sync_queue` view for chats ready to sync
2. Fetches messages from WhatsApp Core API
3. Stores new messages in TimescaleDB
4. Downloads and stores media files in MinIO
5. Updates sync state and schedules next sync
6. Retries failed operations with exponential backoff

### Manual Sync

Trigger sync for a specific chat:

```sql
SELECT whatsapp_gateway.initialize_sync_state(
  'session-name',
  'phone@c.us',
  'full'  -- or 'incremental'
);
```

## 📡 API Endpoints

### Gateway API

Base URL: `http://localhost:4011`

Authentication: `X-Api-Token: YOUR_API_TOKEN`

#### Get Messages

```bash
curl -H "X-Api-Token: YOUR_API_TOKEN" \
  "http://localhost:4011/api/messages/session-name/phone@c.us?limit=50"
```

#### Get Contacts

```bash
curl -H "X-Api-Token: YOUR_API_TOKEN" \
  "http://localhost:4011/api/contacts/session-name?type=individual"
```

#### Get Sessions

```bash
curl -H "X-Api-Token: YOUR_API_TOKEN" \
  "http://localhost:4011/api/sessions"
```

### Webhook Endpoint

Receives events from WhatsApp Core:

```
POST /webhooks/messages
X-Whatsapp-Token: YOUR_WEBHOOK_TOKEN

{
  "event": "message",
  "session": "session-name",
  "data": { ... }
}
```

## 💾 Media Storage

Media files are organized in MinIO:

```
whatsapp-media/
  ├── session-name/
  │   ├── chat-id/
  │   │   ├── 2025/
  │   │   │   ├── 01/
  │   │   │   │   ├── sha256hash.jpg
  │   │   │   │   ├── thumb_sha256hash.jpg
  │   │   │   │   └── sha256hash.mp4
```

Access MinIO Console: `http://localhost:9303`

## 🔍 Monitoring

### Health Checks

```bash
# Full health check
bash scripts/whatsapp/health-check.sh

# API health
curl http://localhost:4011/health

# WhatsApp Core health
curl http://localhost:3311/health

# Database connection
docker exec whatsapp-timescale pg_isready -U whatsapp
```

### Metrics

Key metrics available via SQL:

```sql
-- Message count by session
SELECT session_name, COUNT(*) as message_count
FROM whatsapp_gateway.messages
GROUP BY session_name;

-- Media download status
SELECT download_status, COUNT(*)
FROM whatsapp_gateway.media_downloads
GROUP BY download_status;

-- Active sessions
SELECT * FROM whatsapp_gateway.active_sessions;

-- Sync queue status
SELECT * FROM whatsapp_gateway.sync_queue;
```

## 🛠️ Maintenance

### Backup Database

```bash
docker exec whatsapp-timescale pg_dump -U whatsapp whatsapp_gateway > backup.sql
```

### Restore Database

```bash
docker exec -i whatsapp-timescale psql -U whatsapp whatsapp_gateway < backup.sql
```

### Clear Old Messages

```sql
-- Manual cleanup (older than 30 days)
DELETE FROM whatsapp_gateway.messages
WHERE timestamp < NOW() - INTERVAL '30 days';
```

### Rebuild Indexes

```sql
REINDEX TABLE whatsapp_gateway.messages;
VACUUM ANALYZE whatsapp_gateway.messages;
```

## 🐛 Troubleshooting

### Messages not being saved

1. Check webhook configuration in WhatsApp Core
2. Verify webhook token in Gateway API logs
3. Check database connection
4. Review Gateway API logs: `docker logs whatsapp-gateway-api`

### Sync service not working

1. Check sync service logs: `docker logs whatsapp-sync-service`
2. Verify WhatsApp Core API is accessible
3. Check sync_state table for errors
4. Review sync queue: `SELECT * FROM whatsapp_gateway.sync_queue;`

### Media downloads failing

1. Check MinIO accessibility
2. Verify MinIO credentials
3. Review media_downloads table
4. Check disk space

### High database load

1. Check slow queries: `SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;`
2. Review continuous aggregate refresh policy
3. Adjust PgBouncer pool size
4. Optimize indexes

## 📚 Related Documentation

- [Telegram Stack](../telegram-gateway/README.md) - Similar architecture for Telegram
- [TimescaleDB Documentation](../../database/timescaledb.md)
- [MinIO Documentation](../../tools/storage/minio.md)
- [WAHA Documentation](https://waha.devlike.pro/)

## 🔐 Security

- Use strong passwords for all services
- Enable API authentication tokens
- Restrict network access (bind to localhost when possible)
- Regularly update dependencies
- Monitor access logs
- Encrypt backups

## 📝 License

Internal project - TradingSystem Team

