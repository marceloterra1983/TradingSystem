# Timezone Configuration - São Paulo Market

## Overview

All trading system components are now configured to use **America/Sao_Paulo timezone (UTC-3)** to align with Brazilian market hours.

## Configuration Summary

### ✅ Docker Containers

#### B3 Services (infrastructure/b3/docker-compose.yml)
All services configured with `TZ=America/Sao_Paulo`:

- **b3-cron** - DXY collection scheduler
  - Cron jobs run at: 08:50, 08:55, 09:00 São Paulo time
  - Python scripts use `pytz.timezone('America/Sao_Paulo')`

- **b3-system** - JSON API server
  - Logs in São Paulo timezone
  - Data consolidation respects local time

- **b3-market-data-api** - QuestDB integration
  - Timestamps formatted for São Paulo timezone
  - Node.js using `TZ=America/Sao_Paulo`

- **b3-dashboard** - Frontend dashboard
  - Displays data in local São Paulo time

#### QuestDB (frontend/apps/tp-capital/infrastructure/docker-compose.yml)
```yaml
environment:
  - TZ=America/Sao_Paulo
volumes:
  - /etc/timezone:/etc/timezone:ro
  - /etc/localtime:/etc/localtime:ro
```

#### TP Capital Services
- **tp-capital-ingestion** - Telegram signals
  - `TZ=America/Sao_Paulo` in environment
  - Logs and data timestamps in local time

### ✅ Backend APIs

All backend API services have TZ configured in .env.example:

1. **idea-bank** (Port 3200)
   - File: `backend/api/idea-bank/.env.example`
   - Setting: `TZ=America/Sao_Paulo`

2. **tp-capital-signals** (Port 4005)
   - File: `frontend/apps/tp-capital/.env.example`
   - Setting: `TZ=America/Sao_Paulo`

3. **b3-market-data** (Port 4010)
   - File: `frontend/apps/b3-market-data/.env.example`
   - Setting: `TZ=America/Sao_Paulo`

### ✅ Frontend (Dashboard)

File: `frontend/apps/dashboard/.env.example`

```env
VITE_TIMEZONE=America/Sao_Paulo
VITE_LOCALE=pt-BR
```

All timestamp formatting uses:
```typescript
toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
```

## Data Storage & Timestamps

### QuestDB Behavior
- **Storage**: All timestamps stored in **UTC** (standard practice)
- **Display**: Converted to São Paulo time in application layer
- **Collection**: Scripts collect at São Paulo local time (08:50, 08:55, 09:00)

### Example Timestamps

Today's DXY data (2025-10-13):

| Bucket | Value | Collection Time (São Paulo) | Stored in QuestDB (UTC) |
|--------|-------|----------------------------|-------------------------|
| dxy_08h50 | 0.26% | 08:50 -03 | 11:50 UTC |
| dxy_08h55 | 0.26% | 08:55 -03 | 11:55 UTC |
| dxy_09h00 | 0.22% | 09:00 -03 | 12:00 UTC |

## Verification Commands

### Check Container Timezone
```bash
# B3 Cron
docker exec tradingsystem-b3-cron date
docker exec tradingsystem-b3-cron printenv TZ

# B3 System
docker exec tradingsystem-b3-system date
docker exec tradingsystem-b3-system printenv TZ

# B3 Market Data API
docker exec tradingsystem-b3-market-data node -e "console.log('TZ:', process.env.TZ)"
```

### Check Python Timezone Handling
```bash
docker exec tradingsystem-b3-cron python3 -c "
from datetime import datetime
import pytz
sp = pytz.timezone('America/Sao_Paulo')
now = datetime.now(sp)
print(f'São Paulo: {now.strftime(\"%Y-%m-%d %H:%M:%S %Z\")}')
print(f'Offset: {now.strftime(\"%z\")}')"
```

### Check Data Timestamps
```bash
# Query QuestDB for today's DXY data
curl -s "http://localhost:9000/exec?query=SELECT+*+FROM+b3_dxy_ticks+WHERE+ts+>+'2025-10-13'+LIMIT+10"

# Check via API
curl -s http://localhost:4010/overview | jq '.data.dxy'
```

## Cron Schedule

All cron jobs use **local container time** (São Paulo):

```cron
# DXY Collections (Monday-Friday, São Paulo time)
50 8 * * 1-5  # 08:50 AM
55 8 * * 1-5  # 08:55 AM
0  9 * * 1-5  # 09:00 AM

# Main B3 collection
0  6 * * 1-5  # 06:00 AM

# Gamma Levels
10 9 * * 1-5  # 09:10 AM
```

## Best Practices

### 1. Always Store UTC in Database
- QuestDB stores all timestamps in UTC
- Application layer converts to local time for display
- This ensures data consistency across timezones

### 2. Use Timezone-Aware Objects
Python:
```python
from datetime import datetime
import pytz

sp_tz = pytz.timezone('America/Sao_Paulo')
now = datetime.now(sp_tz)  # Timezone-aware
```

Node.js:
```javascript
const now = new Date();
const spTime = now.toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo'
});
```

### 3. Format Timestamps Consistently
- **Storage**: ISO 8601 with timezone (e.g., `2025-10-13T08:50:00-03:00`)
- **Display**: Localized format (e.g., `13/10/2025 08:50:00`)
- **API**: UTC ISO format (e.g., `2025-10-13T11:50:00Z`)

## Market Hours (São Paulo Time)

| Market | Open | Close | Timezone |
|--------|------|-------|----------|
| B3 (Stock) | 10:00 | 18:00 | America/Sao_Paulo (UTC-3) |
| B3 (Futures) | 09:00 | 18:00 | America/Sao_Paulo (UTC-3) |
| B3 (After Hours) | 18:00 | 20:00 | America/Sao_Paulo (UTC-3) |

### DXY Collection Times
- **08:50** - Pre-market indicator
- **08:55** - Just before futures open
- **09:00** - Market open reference

## Troubleshooting

### Problem: Timestamps showing wrong time
**Solution**:
1. Check container TZ environment variable
2. Verify `/etc/timezone` and `/etc/localtime` mounts
3. Restart container after configuration change

### Problem: Cron jobs running at wrong time
**Solution**:
1. Verify container timezone: `docker exec <container> date`
2. Check cron configuration: `docker exec <container> crontab -l`
3. Ensure TZ environment variable is set

### Problem: Data ingestion timestamp mismatch
**Solution**:
1. Collection scripts must use timezone-aware datetime objects
2. QuestDB stores UTC - conversion happens at application layer
3. Verify ingestion script uses `pytz.timezone('America/Sao_Paulo')`

## Files Modified

### Docker Compose Files
- [infrastructure/b3/docker-compose.yml](infrastructure/b3/docker-compose.yml)
- [frontend/apps/tp-capital/infrastructure/docker-compose.yml](frontend/apps/tp-capital/infrastructure/docker-compose.yml)

### Environment Configuration
- [backend/api/idea-bank/.env.example](backend/api/idea-bank/.env.example)
- [frontend/apps/tp-capital/.env.example](frontend/apps/tp-capital/.env.example)
- [frontend/apps/b3-market-data/.env.example](frontend/apps/b3-market-data/.env.example)
- [frontend/apps/dashboard/.env.example](frontend/apps/dashboard/.env.example)

## Status

✅ **All components configured for São Paulo timezone (America/Sao_Paulo, UTC-3)**

- Host system: São Paulo timezone
- All Docker containers: `TZ=America/Sao_Paulo`
- QuestDB: UTC storage with São Paulo display
- Python scripts: `pytz.timezone('America/Sao_Paulo')`
- Node.js services: `TZ=America/Sao_Paulo`
- Frontend: `VITE_TIMEZONE=America/Sao_Paulo`, `VITE_LOCALE=pt-BR`
- Cron jobs: Running on São Paulo local time

**Last verified**: 2025-10-13 10:17 -03
