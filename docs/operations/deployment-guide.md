---
title: Deployment Guide - TradingSystem
sidebar_position: 1
tags: [guide, documentation]
domain: shared
type: guide
summary: Deployment Guide - TradingSystem
status: active
last_review: 2025-10-22
---

# Deployment Guide - TradingSystem

**Version:** 2.0
**Last Updated:** January 2025

---

## ⚠️ CRITICAL: NATIVE WINDOWS DEPLOYMENT ONLY

**THIS SYSTEM MUST ALWAYS RUN NATIVELY ON WINDOWS. DOCKER IS NOT SUPPORTED.**

**Why Native Windows Only:**
1. **ProfitDLL Compatibility** - Native Windows 64-bit DLL cannot run efficiently in containers
2. **Performance Requirements** - Docker adds 10-50ms latency (unacceptable for < 500ms requirement)
3. **Disk I/O** - Direct NVMe/SSD access needed for high-frequency Parquet writes (~30% faster than Docker)
4. **Resource Efficiency** - Docker Desktop overhead (1-2GB RAM) reduces available resources for trading
5. **Stability** - Native Windows services provide better reliability for 24/7 operations

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 x64 | Windows 11 x64 |
| **CPU** | Intel i5 / Ryzen 5 | Intel i7 / Ryzen 7+ |
| **RAM** | 16 GB | 32 GB+ |
| **Storage** | 256 GB SSD | 512 GB NVMe SSD |
| **GPU** | - | RTX 3060+ (for ML) |
| **Network** | 10 Mbps | 100 Mbps+ |

### Software Requirements

```powershell
# .NET SDK 8.0 (REQUIRED)
winget install Microsoft.DotNet.SDK.8

# Python 3.11+ (REQUIRED)
winget install Python.Python.3.11

# Node.js 18+ (REQUIRED)
winget install OpenJS.NodeJS.LTS

# Poetry (Python package manager)
pip install poetry

# Git (REQUIRED)
winget install Git.Git

# Prometheus (for monitoring)
# Download from: https://prometheus.io/download/

# Grafana (for dashboards)
# Download from: https://grafana.com/grafana/download?platform=windows
```

---

## Installation

### Option 1: Automated Setup (Recommended)

```powershell
# Clone repository
git clone https://github.com/marceloterra1983/TradingSystem.git
cd TradingSystem

# Run setup script
.\infrastructure\scripts\setup-dev-env.ps1

# Configure credentials
notepad config\development\.env
```

### Option 2: Manual Setup

#### Step 1: Clone Repository

```powershell
git clone https://github.com/marceloterra1983/TradingSystem.git
cd TradingSystem
```

#### Step 2: Build .NET Services

```powershell
# Restore dependencies
dotnet restore TradingSystem.sln

# Build (x64 REQUIRED)
dotnet build TradingSystem.sln -c Release --arch x64

# Run tests
dotnet test TradingSystem.sln
```

#### Step 3: Setup Python Services

```powershell
# Analytics Pipeline
cd src\Services\AnalyticsPipeline
poetry install
# OR: pip install -r requirements.txt

# API Gateway
cd ..\APIGateway
poetry install
# OR: pip install -r requirements.txt

cd ..\..\..
```

#### Step 4: Setup Dashboard

```powershell
cd src\Services\Dashboard
npm install
npm run build
cd ..\..\..
```

#### Step 5: Configure Environment

```powershell
# Copy example config
cp config\development\.env.example config\development\.env

# Edit with your credentials
notepad config\development\.env
```

**Required Configuration:**

```env
# ProfitDLL Credentials
PROFIT_USER=your_email@example.com
PROFIT_PASSWORD=your_password
PROFIT_ACTIVATION_KEY=your_activation_key

# Broker Info
PROFIT_BROKER_ID=1171
PROFIT_ACCOUNT_ID=your_account_id

# Ports
WEBSOCKET_PORT=9001
API_GATEWAY_PORT=8000
ORDER_MANAGER_PORT=5055
DASHBOARD_PORT=5173

# Risk Management
MAX_DAILY_LOSS=5000.00
MAX_POSITION_SIZE=5
TRADING_START_HOUR=9
TRADING_END_HOUR=18
```

---

## Deployment Options

### Option A: Automated Script (Recommended)

```powershell
# Start all services with one command
.\infrastructure\scripts\start-all-services.ps1

# View status
.\infrastructure\scripts\check-services-status.ps1

# Stop all services
.\infrastructure\scripts\stop-all-services.ps1
```

**Service URLs:**
- Dashboard: http://localhost:5173
- API Gateway: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Order Manager: http://localhost:5055
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

### Option B: Manual Start (Development)

Open 5 separate PowerShell terminals:

**Terminal 1 - Analytics Pipeline:**
```powershell
cd src\Services\AnalyticsPipeline
poetry run python src\main.py
```

**Terminal 2 - Data Capture:**
```powershell
cd src\Services\DataCapture\TradingSystem.DataCapture
dotnet run
```

**Terminal 3 - API Gateway:**
```powershell
cd src\Services\APIGateway
poetry run uvicorn src.main:app --reload --port 8000
```

**Terminal 4 - Order Manager:**
```powershell
cd src\Services\OrderManager\TradingSystem.OrderManager
dotnet run
```

**Terminal 5 - Dashboard:**
```powershell
cd src\Services\Dashboard
npm run dev
```

### Option C: Windows Services (Production - Recommended)

```powershell
# Install all services (requires Administrator)
.\infrastructure\scripts\install-windows-services.ps1

# Start individual services
sc.exe start TradingSystem-DataCapture
sc.exe start TradingSystem-Analytics
sc.exe start TradingSystem-Gateway
sc.exe start TradingSystem-OrderManager
sc.exe start TradingSystem-Dashboard

# Or start all at once
.\infrastructure\scripts\start-windows-services.ps1

# Check status
Get-Service TradingSystem-*

# Stop all services
.\infrastructure\scripts\stop-windows-services.ps1

# Uninstall services
.\infrastructure\scripts\uninstall-windows-services.ps1
```

**Benefits of Windows Services:**
- Auto-start on system boot
- Runs in background without user login
- Windows Event Log integration
- Service recovery options (auto-restart on failure)
- Better resource management

---

## Verification

### Health Checks

```powershell
# Check DataCapture
curl http://localhost:8080/health

# Check Analytics
curl http://localhost:9001/health

# Check API Gateway
curl http://localhost:8000/health

# Check Order Manager
curl http://localhost:5055/health

# Check Dashboard
curl http://localhost:5173
```

### Service Status

```powershell
# Windows Services
Get-Service TradingSystem-* | Format-Table -AutoSize

# Process status (if running manually)
Get-Process | Where-Object {$_.ProcessName -match "dotnet|python|node"} | Format-Table -AutoSize
```

### Logs

```powershell
# Real-time logs
Get-Content data\logs\datacapture\$(Get-Date -Format "yyyy-MM-dd").jsonl -Tail 50 -Wait

# View all service logs
.\infrastructure\scripts\view-logs.ps1

# Windows Event Logs (for Windows Services)
Get-EventLog -LogName Application -Source TradingSystem-* -Newest 50
```

---

## Configuration

### Environment-Specific Configs

```
config/
├── development/
│   ├── .env
│   └── appsettings.Development.json
├── production/
│   ├── .env
│   └── appsettings.Production.json
└── shared/
    └── logging.json
```

### Switching Environments

```powershell
# Development
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:ENVIRONMENT="development"

# Production
$env:ASPNETCORE_ENVIRONMENT="Production"
$env:ENVIRONMENT="production"
```

---

## Monitoring

### Prometheus Metrics

Access: http://localhost:9090

**Key Metrics:**
- `datacapture_ticks_received_total` - Total ticks
- `analytics_signals_generated_total` - Total signals
- `orders_executed_total` - Total orders
- `system_latency_ms` - End-to-end latency

### Grafana Dashboards

Access: http://localhost:3000 (admin/admin)

**Dashboards:**
1. System Health - Service status, latency, errors
2. Trading Performance - P&L, hit rate, drawdown
3. Data Flow - Tick volume, signal frequency

---

## Backup & Recovery

### Automated Backup

```powershell
# Schedule daily backup (Task Scheduler)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-File C:\TradingSystem\infrastructure\scripts\backup-data.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At "02:00AM"

Register-ScheduledTask -TaskName "TradingSystem-Backup" `
    -Action $action -Trigger $trigger
```

### Manual Backup

```powershell
# Backup script
.\infrastructure\scripts\backup-data.ps1

# Backup location
# data\backups\YYYY-MM-DD\
```

### Recovery

```powershell
# Restore from backup
.\infrastructure\scripts\restore-data.ps1 -Date "2025-01-04"
```

---

## Troubleshooting

### Common Issues

**Issue: DllNotFoundException**
```powershell
# Solution: Ensure x64 build
dotnet build --arch x64

# Verify DLL exists
Test-Path "DOCS_PRFITDLL\DLLs\Win64\ProfitDLL.dll"
```

**Issue: Port Already in Use**
```powershell
# Find process using port
netstat -ano | findstr :9001

# Kill process
taskkill /PID <pid> /F
```

**Issue: Connection Timeout**
```powershell
# Check ProfitDLL credentials
notepad config\development\.env

# Verify Profit Pro is running
Get-Process | Where-Object {$_.ProcessName -match "Profit"}
```

**Issue: Out of Memory**
```powershell
# Check system memory usage
Get-Process | Sort-Object -Property WS -Descending | Select-Object -First 10

# Monitor specific services
Get-Process -Name dotnet,python,node | Format-Table Name, @{Name="Memory(MB)";Expression={$_.WS/1MB}}
```

---

## Security

### Credential Encryption

```powershell
# Encrypt .env file
.\infrastructure\scripts\encrypt-config.ps1

# Decrypt (automatic on startup)
# Uses Windows Data Protection API (DPAPI)
```

### Firewall Rules

```powershell
# Allow ports (run as admin)
New-NetFirewallRule -DisplayName "TradingSystem-WebSocket" `
    -Direction Inbound -LocalPort 9001 -Protocol TCP -Action Allow

New-NetFirewallRule -DisplayName "TradingSystem-API" `
    -Direction Inbound -LocalPort 8000,5055,5173 -Protocol TCP -Action Allow
```

### SSL/TLS (Production)

```powershell
# Generate self-signed certificate
New-SelfSignedCertificate -DnsName "localhost" `
    -CertStoreLocation "cert:\LocalMachine\My"

# Configure in appsettings.Production.json
```

---

## Performance Tuning

### .NET Optimization

```xml
<!-- TradingSystem.DataCapture.csproj -->
<PropertyGroup>
  <ServerGarbageCollection>true</ServerGarbageCollection>
  <ConcurrentGarbageCollection>true</ConcurrentGarbageCollection>
  <TieredCompilation>true</TieredCompilation>
  <TieredCompilationQuickJit>true</TieredCompilationQuickJit>
</PropertyGroup>
```

### Python Optimization

```bash
# Use faster JSON library
pip install orjson

# Use PyPy for better performance
pypy3 -m pip install -r requirements.txt
pypy3 src/main.py
```

### Database (Parquet) Optimization

```python
# Partition by date
pa.parquet.write_to_dataset(
    table,
    root_path='data/parquet',
    partition_cols=['symbol', 'date']
)

# Use compression
pa.parquet.write_table(
    table,
    file_path,
    compression='snappy'
)
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

```powershell
# Run multiple Analytics instances for load balancing
Start-Process powershell -ArgumentList "-Command cd src\Services\AnalyticsPipeline; poetry run python src\main.py --port 9001"
Start-Process powershell -ArgumentList "-Command cd src\Services\AnalyticsPipeline; poetry run python src\main.py --port 9002"
Start-Process powershell -ArgumentList "-Command cd src\Services\AnalyticsPipeline; poetry run python src\main.py --port 9003"

# Configure load balancer in APIGateway config
```

### Vertical Scaling (Resource Allocation)

```powershell
# Set process priority (Windows)
$process = Get-Process -Name "TradingSystem.DataCapture"
$process.PriorityClass = "High"

# Set CPU affinity (dedicate specific cores)
$process.ProcessorAffinity = 0x00FF  # Use first 8 cores

# Increase .NET thread pool
$env:DOTNET_ThreadPool_MinWorkerThreads = 100
```

---

## Maintenance

### Updates

```powershell
# Pull latest changes
git pull origin main

# Rebuild
dotnet build TradingSystem.sln -c Release --arch x64
poetry install

# Restart services (Windows Services)
.\infrastructure\scripts\restart-windows-services.ps1

# Or restart manually
Get-Service TradingSystem-* | Restart-Service
```

### Database Maintenance

```powershell
# Compact Parquet files
python tools\compact-parquet.py

# Vacuum logs (remove old entries)
python tools\vacuum-logs.py --days 90
```

### Log Rotation

```powershell
# Automatic (configured in logging.json)
# Rotates daily, keeps 30 days

# Manual cleanup
Remove-Item data\logs\*\* -Include *.jsonl -Exclude (Get-Date).ToString("yyyy-MM-dd")*.jsonl
```

---

## Rollback

```powershell
# Rollback to previous version
git checkout tags/v0.9.0

# Rebuild
dotnet build -c Release --arch x64

# Restore data from backup
.\infrastructure\scripts\restore-data.ps1 -Date "2025-01-03"

# Restart
.\infrastructure\scripts\restart-windows-services.ps1
```

---

## Support

### Logs Location

```
data/logs/
├── datacapture/2025-01-04.jsonl
├── analytics/2025-01-04.jsonl
├── gateway/2025-01-04.jsonl
└── ordermanager/2025-01-04.jsonl
```

### Debug Mode

```powershell
# Enable debug logging
$env:LOG_LEVEL="DEBUG"

# Run with verbose output
dotnet run --verbosity detailed
```

### Health Report

```powershell
# Generate health report
.\infrastructure\scripts\health-report.ps1 > health-$(Get-Date -Format "yyyyMMdd").txt
```

---

## References

- [Technical Specification](../architecture/technical-specification.md)
- [ProfitDLL Integration](../integrations/profitdll-integration.md)
- [Monitoring Guide](monitoring-guide.md)
- [Troubleshooting](troubleshooting.md)
