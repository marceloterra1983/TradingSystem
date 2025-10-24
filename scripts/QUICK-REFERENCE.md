# 🚀 Referência Rápida - Scripts TradingSystem

## Comandos Mais Usados

### Iniciar Tudo

**Windows:**
```powershell
.\scripts\startup\start-trading-system-dev.ps1 -StartMonitoring
```

**Linux:**
```bash
bash scripts/startup/start-trading-system-dev.sh --start-monitoring
```

---

### Parar Tudo

**Windows:**
```powershell
# Parar Docker
cd infrastructure\monitoring; docker compose down
cd ..\tp-capital; docker compose down

# Parar Node
Stop-Process -Name node -Force
```

**Linux:**
```bash
# Parar Docker
cd tools/monitoring && docker compose down
cd ../tp-capital && docker compose down

# Parar Node
pkill node
```

---

### Verificar Status

**Portas:**
```bash
# Idea Bank:       http://localhost:3200
# Dashboard:       http://localhost:5173
# Docs:            http://localhost:3004
# Laucher:http://localhost:9999
# Prometheus:      http://localhost:9090
# Grafana:         http://localhost:3000
# Alertmanager:    http://localhost:9093
```

**Verificar processos:**
```bash
# Linux
lsof -i :3200
lsof -i :5173

# Windows
netstat -ano | findstr "3200"
```

---

### Apenas Backend

**Windows:**
```powershell
.\scripts\startup\start-trading-system-dev.ps1 -SkipFrontend -SkipDocs
```

**Linux:**
```bash
bash scripts/startup/start-trading-system-dev.sh --skip-frontend --skip-docs
```

---

### Apenas Frontend

**Windows:**
```powershell
.\scripts\startup\start-trading-system-dev.ps1 -SkipIdeaBank -SkipDocs
```

**Linux:**
```bash
bash scripts/startup/start-trading-system-dev.sh --skip-idea-bank --skip-docs
```

---

### Logs

```bash
# Docker
docker compose logs -f

# Service específico
docker logs -f tradingsystem-prometheus

# Node processes
tail -f backend/api/idea-bank/logs/app.log
```

---

### Setup Inicial (Linux)

```bash
bash scripts/setup/setup-linux-environment.sh
```

---

### Matar Processo em Porta Específica

**Linux:**
```bash
lsof -i :3200 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

**Windows:**
```powershell
$port = 3200
$processId = (Get-NetTCPConnection -LocalPort $port).OwningProcess
Stop-Process -Id $processId -Force
```

---

## Atalhos Úteis

### Criar Aliases (Linux)

Adicione ao `~/.bashrc`:

```bash
alias tsd='cd ~/projetos/TradingSystem'
alias tsd-start='tsd && bash scripts/startup/start-trading-system-dev.sh --start-monitoring'
alias tsd-stop='pkill node && cd ~/projetos/TradingSystem/tools/monitoring && docker compose down'
alias tsd-logs='docker compose logs -f'
alias tsd-status='lsof -i :3100 && lsof -i :3103 && docker ps'
```

### Criar Aliases (Windows PowerShell)

Adicione ao seu `$PROFILE`:

```powershell
function tsd { cd C:\path\to\TradingSystem }
function tsd-start { 
  tsd
  .\scripts\startup\start-trading-system-dev.ps1 -StartMonitoring 
}
function tsd-stop { 
  Stop-Process -Name node -Force
  tsd
  cd infrastructure\monitoring
  docker compose down
}
```

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Script não executa (Linux) | `chmod +x tools/scripts/*.sh` |
| Docker requer sudo | `sudo usermod -aG docker $USER` (logout/login) |
| Porta em uso | Ver "Matar Processo em Porta" acima |
| node_modules corrompido | `rm -rf node_modules && npm install` |
| Terminal não abre (Linux) | `sudo apt install gnome-terminal` |

---

## Documentação Completa

- [README dos Scripts](./README.md)
- [Guia de Migração Linux](../docs/context/ops/linux-migration-guide.md)
- [Scripts Documentation](../docs/context/ops/scripts/README.md)






