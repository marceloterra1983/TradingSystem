# Telegram Gateway (Shared Service)

**Shared Telegram integration service** that handles authentication, session management, and message forwarding for all TradingSystem applications.

## 🎯 Purpose

The Telegram Gateway is a **standalone local service** that:

- Manages Telegram authentication (MTProto protocol)
- Stores session files securely on local disk
- Receives messages from Telegram (bot + user account)
- Forwards messages to target APIs via HTTP POST
- Implements retry logic with exponential backoff
- Persists failed messages to JSONL queue
- Exports Prometheus metrics

## 🏗️ Architecture

```
Telegram Servers
    ↓ MTProto
Telegram Gateway (LOCAL - Port 4006)
    ↓ HTTP POST /ingest (X-Gateway-Token)
    ├──→ TP Capital API (http://localhost:4005/ingest)
    ├──→ Other Apps (extensible)
    └──→ Failure Queue (JSONL) if API unavailable
```

## 📋 Prerequisites

- Node.js 18+ (for ES modules support)
- Telegram API credentials from https://my.telegram.org/apps
- (Optional) Telegram Bot Token from @BotFather
- (Optional) systemd for auto-start on Linux

## 🚀 Installation

### 1. Install Dependencies

```bash
cd apps/telegram-gateway
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

**Required variables:**
```env
# Server
GATEWAY_PORT=4006

# Telegram Credentials (from my.telegram.org/apps)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_PHONE_NUMBER=+1234567890

# Bot Token (optional, from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token

# Target API Configuration
API_ENDPOINTS=http://localhost:4005/ingest
API_SECRET_TOKEN=generate_secure_random_token_here

# Retry & Queue
MAX_RETRIES=3
BASE_RETRY_DELAY_MS=5000
FAILURE_QUEUE_PATH=./data/failure-queue.jsonl
```

### 3. First Run (Authentication)

```bash
npm start
```

**First-time setup will prompt for:**
1. Phone number verification code (SMS)
2. 2FA password (if enabled)

**Session will be saved to** `.session/` for future use.

### 4. Install as systemd Service (Linux)

```bash
# Copy service file
sudo cp telegram-gateway.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start on boot
sudo systemctl enable telegram-gateway

# Start service
sudo systemctl start telegram-gateway

# Check status
sudo systemctl status telegram-gateway

# View logs
sudo journalctl -u telegram-gateway -f
```

## 🔌 Usage

### Health Check

```bash
curl http://localhost:4006/health
```

**Response (healthy):**
```json
{
  "status": "healthy",
  "telegram": "connected",
  "uptime": 12345.67,
  "timestamp": "2025-10-25T12:00:00.000Z"
}
```

### Prometheus Metrics

```bash
curl http://localhost:4006/metrics
```

**Key metrics:**
- `telegram_connection_status` - Connection status (0=disconnected, 1=connected)
- `telegram_messages_received_total{channel_id}` - Messages received per channel
- `telegram_messages_published_total` - Successfully published messages
- `telegram_publish_failures_total{reason}` - Failed publish attempts
- `telegram_failure_queue_size` - Current queue size

### Failure Queue Recovery

If the target API is unavailable, messages are saved to `data/failure-queue.jsonl`.

**To recover queued messages:**
```bash
# TODO: Create recovery script
node scripts/recover-queue.js
```

## 🔐 Security

### Session Files

**⚠️ CRITICAL: Never commit `.session/` files to git!**

Session files contain:
- Encrypted authentication tokens
- User credentials
- **Permissions: 0600 (owner read/write only)**

**Location:** `apps/telegram-gateway/.session/`

**Backups:**
```bash
tar -czf telegram-sessions-backup-$(date +%Y%m%d).tar.gz .session/
```

### API Authentication

Messages are forwarded with header:
```
X-Gateway-Token: <API_SECRET_TOKEN>
```

**Target APIs MUST validate this token!**

## 📊 Monitoring

### systemd Status

```bash
systemctl status telegram-gateway
systemctl is-active telegram-gateway
```

### Logs

```bash
# Real-time logs
sudo journalctl -u telegram-gateway -f

# Last 100 lines
sudo journalctl -u telegram-gateway -n 100

# Errors only
sudo journalctl -u telegram-gateway -p err
```

### Prometheus Integration

Add to Prometheus `scrape_configs`:

```yaml
scrape_configs:
  - job_name: 'telegram-gateway'
    static_configs:
      - targets: ['localhost:4006']
    metrics_path: '/metrics'
```

## 🐛 Troubleshooting

### Session Expired

**Symptom:** `Session expired` error in logs

**Solution:**
```bash
# Rename expired session
mv .session/session.session .session/session.session.expired-$(date +%Y%m%d)

# Restart service (will prompt for reauth)
sudo systemctl restart telegram-gateway
```

### Connection Lost

**Symptom:** `unhealthy` status, `telegram: disconnected`

**Check:**
1. Internet connectivity
2. Telegram API credentials in `.env`
3. Session file permissions (`chmod 600 .session/*`)

**Restart:**
```bash
sudo systemctl restart telegram-gateway
```

### Failure Queue Growing

**Symptom:** `telegram_failure_queue_size` > 100

**Cause:** Target API unavailable

**Actions:**
1. Check target API status: `curl http://localhost:4005/health`
2. Fix API connection
3. Run recovery script: `node scripts/recover-queue.js`

## 🔄 Message Flow

1. **Receive:** Telegram → Gateway (via Telegraf bot or TelegramClient)
2. **Validate:** Gateway validates message structure
3. **Publish:** Gateway POSTs to target API(s) with `X-Gateway-Token`
4. **Retry:** If API fails, retry with exponential backoff (5s, 10s, 20s)
5. **Queue:** If all retries fail, append to `failure-queue.jsonl`
6. **Metrics:** Update Prometheus counters

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev  # Uses nodemon for auto-reload
```

### Test Message Flow

```bash
# 1. Start Gateway
npm start

# 2. Send test message via Telegram to monitored channel

# 3. Check logs
tail -f logs/gateway.log

# 4. Verify API received message
curl http://localhost:4005/signals?limit=1
```

## 📝 Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GATEWAY_PORT` | No | 4006 | HTTP server port |
| `TELEGRAM_API_ID` | Yes | - | From my.telegram.org |
| `TELEGRAM_API_HASH` | Yes | - | From my.telegram.org |
| `TELEGRAM_PHONE_NUMBER` | Yes* | - | For MTProto client |
| `TELEGRAM_BOT_TOKEN` | Yes* | - | From @BotFather |
| `API_ENDPOINTS` | Yes | - | Comma-separated URLs |
| `API_SECRET_TOKEN` | Yes | - | Shared secret for auth |
| `MAX_RETRIES` | No | 3 | Retry attempts |
| `BASE_RETRY_DELAY_MS` | No | 5000 | Base delay (ms) |
| `FAILURE_QUEUE_PATH` | No | `./data/failure-queue.jsonl` | Queue file path |
| `LOG_LEVEL` | No | info | Pino log level |

\* Either `TELEGRAM_PHONE_NUMBER` or `TELEGRAM_BOT_TOKEN` required

## 🚦 Service Commands

```bash
# Start
sudo systemctl start telegram-gateway

# Stop
sudo systemctl stop telegram-gateway

# Restart
sudo systemctl restart telegram-gateway

# Status
sudo systemctl status telegram-gateway

# Enable auto-start
sudo systemctl enable telegram-gateway

# Disable auto-start
sudo systemctl disable telegram-gateway

# View logs
sudo journalctl -u telegram-gateway -f
```

## 📚 Related Documentation

- **Specification:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/specs/telegram-gateway/spec.md`
- **Design Decisions:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/design.md`
- **Implementation Tasks:** `tools/openspec/changes/unified-tp-capital-split-workspace-containerize/tasks.md`

## 📄 License

MIT
