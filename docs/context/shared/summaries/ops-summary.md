---
title: Operations Summary
sidebar_position: 30
tags: [ops, summary, shared]
domain: shared
type: reference
summary: Executive summary of deployment, monitoring, and operational procedures
status: active
last_review: 2025-10-17
---

# Operations Summary

## 🚀 Deployment Model

**Hybrid Architecture**: Native Windows + Docker

### Core Trading Services (Native Windows Services)
**WHY Native**: ProfitDLL integration, &lt;500ms latency requirement, direct NVMe I/O

- **Data Capture** (.NET 8)
  - Service: `TradingSystem-DataCapture`
  - Port: 5050
  - Auto-start: Yes, Restart on failure

- **Order Manager** (.NET 8)
  - Service: `TradingSystem-OrderManager`
  - Port: 5055
  - Auto-start: Yes, Restart on failure

  - Port: 9001 (WebSocket)
  - Auto-start: Yes

- **API Gateway** (FastAPI)
  - Port: 8000
  - Auto-start: Yes

### Auxiliary Services (Docker Allowed)
**WHY Docker**: Non-latency-critical, easier scaling, isolated environments

- **Idea Bank API** (Node.js)
  - Image: `node:18-alpine` (optional)
  - Port: 3200
  - Can run natively if preferred

- **Documentation API** (Node.js)
  - Port: 3300

- **Prometheus** (Monitoring)
  - Image: `prom/prometheus`
  - Port: 9090

- **Grafana** (Dashboards)
  - Image: `grafana/grafana`
  - Port: 3000

---

## 🛠️ Infrastructure Requirements

**Hardware**:
- CPU: Intel/AMD x64, 8+ cores
- RAM: 16GB minimum, 32GB recommended
- Disk: NVMe SSD (low latency required)
- Network: 1 Gbps, &lt;10ms to broker

**Software**:
- OS: Windows 10/11 or Server 2019/2022
- .NET 8.0 x64 Runtime
- Python 3.11 (native Windows install)
- Node.js 18 (for auxiliary services)
- Docker Desktop (optional, for auxiliary)

---

## 📊 Monitoring & Observability

### Current State

**Logging**:
- **Format**: JSONL structured logs
- **Libraries**: Pino (Node.js), Python logging, console (.NET)
- **Location**: `C:\TradingSystem\data\logs\{service}\{date}.jsonl`
- **Retention**: 30 days

**Monitoring**:
- **Dashboard**: ConnectionsPage shows basic service health
- **Manual Checks**: PowerShell scripts for service status

### Planned (Q4 2025 - Q1 2026)

**Prometheus Stack**:
- Metrics endpoints on all services
- Scrape interval: 15s
- Retention: 15 days
- Port: 9090

**Grafana Dashboards**:
- **System Health**: CPU, RAM, disk, network
- **Trading Pipeline**: Latency P50/P95/P99, throughput
- **ProfitDLL**: Connection state, callback success rate
- **Order Execution**: Order flow, rejection rate, position tracking
- Port: 3000

**Alerting**:
- Critical: PagerDuty integration
- Warning: Slack notifications
- Thresholds: P95 latency >500ms, error rate >1%, connection drops

---

## 💾 Backup & Recovery

### Backup Strategy

**Automated Daily Backup**:
- **Schedule**: 2:00 AM daily (PowerShell scheduled task)
- **Script**: `infrastructure/scripts/backup-trading-data.ps1`
- **What**: LowDB JSON files, Parquet files (last 7 days), Logs (last 7 days)
- **Where**: `C:\TradingSystem\backups\{date}\`
- **Retention**: 30 days of daily backups

**Manual Backup**:
- Run: `.\infrastructure\scripts\backup-now.ps1`
- Before: Major deployments, configuration changes

### Recovery Procedures

**Data Restore**:
1. Stop all services: `.\infrastructure\scripts\stop-all-services.ps1`
2. Restore from backup: `.\infrastructure\scripts\restore-from-backup.ps1 -Date 2025-10-10`
3. Verify data integrity
4. Start services: `.\infrastructure\scripts\start-all-services.ps1`

**Service Recovery**:
- Individual service restart: `Restart-Service TradingSystem-DataCapture`
- Full system restart: Reboot + auto-start
- **Recovery Time Objective (RTO)**: &lt;10 minutes
- **Recovery Point Objective (RPO)**: &lt;24 hours

---

## 🔧 Automation Scripts

Location: `infrastructure/scripts/`

### Startup & Shutdown
- `start-all-services.ps1` - Start all TradingSystem services
- `stop-all-services.ps1` - Graceful shutdown of all services
- `restart-all-services.ps1` - Restart with health checks
- `register-trading-system-dev-startup.ps1` - Auto-start on logon (development)

### Deployment
- `deploy-core-services.ps1` - Deploy native Windows services
- `deploy-auxiliary-docker.ps1` - Deploy Docker containers
- `rollback-deployment.ps1` - Rollback to previous version

### Maintenance
- `backup-now.ps1` - Immediate backup
- `restore-from-backup.ps1` - Restore specific backup
- `clean-old-logs.ps1` - Remove logs older than 30 days
- `health-check.ps1` - Comprehensive health check

### Monitoring
- `check-service-status.ps1` - All service status
- `check-profitdll-connection.ps1` - ProfitDLL health
- `check-disk-space.ps1` - Disk usage alerts

---

## 📋 Incident Response

### Common Scenarios

**1. ProfitDLL Connection Lost**
- Runbook: [incident-profitdll-reconnect.md](../../ops/incidents/incident-profitdll-reconnect.md)
- Auto-recovery: 3 retry attempts (5s interval)
- Escalation: Manual intervention if >60s degraded

**2. Idea Bank API Down**
- Runbook: [incident-idea-bank-down.md](../../ops/incidents/incident-idea-bank-down.md)
- Impact: Dashboard unavailable, no impact on trading
- Recovery: Restart service, verify LowDB file integrity

---

## 🎯 Operational Metrics

### Service Level Indicators (SLIs)

- **Availability**: 99.5% during market hours (9:00-18:00)
- **Latency**: P95 < 500ms (tick to order)
- **Order Success Rate**: >99% (excluding risk rejections)
- **Data Loss**: 0% (no missed ticks)

### Service Level Objectives (SLOs)

- **Data Capture Uptime**: 99.9%
- **Order Manager Uptime**: 99.9%
- **API Gateway Uptime**: 99.5%
- **Dashboard Uptime**: 99% (non-critical)

---

## 🚀 Upcoming Work

**Q4 2025**:
- ⏳ Prometheus metrics implementation
- ⏳ Grafana dashboard setup
- ⏳ Automated health checks
- ⏳ Incident runbook completion

**Q1 2026**:
- 🔜 Centralized logging (ELK/Grafana Loki)
- 🔜 PagerDuty/Slack alerting integration
- 🔜 Automated deployment pipeline (CI/CD)
- 🔜 Disaster recovery testing

**Q2 2026**:
- 🔜 Multi-environment support (staging/production)
- 🔜 Blue-green deployment strategy
- 🔜 Automated rollback on health check failure
- 🔜 Capacity planning automation

---

## 🔗 Related Documentation

- [Windows Native Deployment](../../ops/deployment/windows-native.md)
- [Prometheus Setup Guide](../../ops/monitoring/prometheus-setup.md)
- [Incident Runbooks](../../ops/incidents/incidents.md)
- [Automation Scripts](../../ops/automation/automation.md)
- [Deployment Architecture Diagram](../diagrams-overview.md#7-deployment-architecture)
- [Connection States Diagram](../diagrams-overview.md#6-state-machine---connection-states)
