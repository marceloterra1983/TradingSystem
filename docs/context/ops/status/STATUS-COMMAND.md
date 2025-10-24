# Status Command - Complete Documentation

## 🎯 Overview

O comando **`status`** fornece uma visão completa e em tempo real do estado do TradingSystem, incluindo:
- ✅ Todos os serviços Node.js
- ✅ Todos os containers Docker
- ✅ Recursos do sistema (CPU, memória, disco)
- ✅ URLs de acesso
- ✅ Health checks

---

## 🚀 Quick Start

### Comando Básico

```bash
# Via symlink (após criar symlinks)
./status-tradingsystem

# Via alias (após install-shortcuts.sh)
status
```

---

## 📋 Modos de Uso

### 1. Status Completo (Padrão)

```bash
status
```

**Mostra:**
- ✅ Lista completa de serviços Node.js (nome, status, PID, porta)
- ✅ Lista completa de containers Docker (nome, status, health)
- ✅ Recursos do sistema (CPU, RAM, disco)
- ✅ Resumo geral

**Saída:**
```
╔═══════════════════════════════════════════════════════════════╗
║  📊 TradingSystem - System Status                        ║
╚═══════════════════════════════════════════════════════════════╝

━━━ Node.js Services ━━━

Service                   Status          PID        Port      
-------                   ------          ---        ----      
workspace-api             ● Running       123456     3200      
b3-market-data            ● Running       123457     3302      
service-launcher          ● Running       123458     3500      
firecrawl-proxy           ● Running       123459     3600      
frontend-dashboard        ● Running       123461     3103      
docusaurus                ● Running       123462     3004      

✓ All services running (7/7)

━━━ Docker Containers ━━━

Container                      Status          Health         
---------                      ------          ------         
data-frontend-apps             ● Running       ✓ Healthy     
data-timescaledb               ● Running       ✓ Healthy     
data-questdb                   ● Running       ✓ Healthy     
docs-api                       ● Running       ✓ Healthy     
mon-prometheus                 ● Running       ✓ Healthy     
mon-grafana                    ● Running       ✓ Healthy     
firecrawl-api                  ● Running       ✓ Healthy     

✓ All containers running (11/11)

━━━ System Resources ━━━

CPU Usage:     15.3%
Memory:        8.2G/32G (25%)
Disk (root):   145G/500G (29%)
Docker:        24/24 containers running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All systems operational
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Resumo Rápido

```bash
status --quick
# ou
status-quick
```

**Mostra:**
- ✅ Contagem de serviços
- ✅ Contagem de containers
- ✅ Recursos do sistema
- ✅ URLs principais

**Ideal para:** Check rápido, scripts, automação

**Saída:**
```
╔═══════════════════════════════════════════════════════════════╗
║  📊 TradingSystem - System Status                        ║
╚═══════════════════════════════════════════════════════════════╝

━━━ Quick Summary ━━━

Services:      7 processes
Containers:    24 running

Key URLs:
  Dashboard:       http://localhost:3103
  Documentation:   http://localhost:3004
  Prometheus:      http://localhost:9090
  Grafana:         http://localhost:3000

━━━ System Resources ━━━

CPU Usage:     15.3%
Memory:        8.2G/32G (25%)
Disk (root):   145G/500G (29%)
Docker:        24/24 containers running
```

### 3. Apenas Serviços Node.js

```bash
status --services
# ou
status-services
```

**Mostra:**
- ✅ Apenas serviços Node.js
- ✅ Status detalhado de cada serviço

**Ideal para:** Debug de serviços específicos

### 4. Apenas Containers Docker

```bash
status --docker
# ou
status-docker
```

**Mostra:**
- ✅ Apenas containers Docker
- ✅ Status e health de cada container

**Ideal para:** Debug de infraestrutura

### 5. Monitoramento Contínuo

```bash
status --watch
# ou
status-watch
```

**Mostra:**
- ✅ Status completo com refresh automático a cada 5 segundos
- ✅ Atualização em tempo real

**Ideal para:** Monitoramento durante startup, troubleshooting

**Saída:**
```
(atualiza a cada 5 segundos)

...status completo...

Refreshing in 5 seconds... (Ctrl+C to exit)
```

**Parar:** `Ctrl+C`

### 6. Saída JSON

```bash
status --json
```

**Mostra:**
- ✅ Saída estruturada em JSON
- ✅ Parseable para scripts e automação

**Ideal para:** Integração com outros sistemas, CI/CD

---

## 🎨 Indicadores Visuais

### Status de Serviços

| Indicador | Significado |
|-----------|-------------|
| `● Running` (verde) | Serviço rodando normalmente |
| `● Stopped` (vermelho) | Serviço parado |
| `● Zombie` (amarelo) | Processo existe mas não responde |

### Health de Containers

| Indicador | Significado |
|-----------|-------------|
| `✓ Healthy` (verde) | Container saudável |
| `✗ Unhealthy` (vermelho) | Container com problemas |
| `⟳ Starting` (amarelo) | Container iniciando |
| `N/A` (cinza) | Sem healthcheck |

### Status Geral

| Mensagem | Exit Code | Significado |
|----------|-----------|-------------|
| `✓ All systems operational` | 0 | Tudo OK |
| `! Minor issues detected` | 1 | Alguns problemas (1-3 serviços) |
| `✗ Multiple issues detected` | 2 | Problemas críticos (4+ serviços) |

---

## 📊 O Que É Verificado

### Serviços Node.js (7)

1. **workspace-api** (3200) - API de workspace
2. **b3-market-data** (3302) - Dados do mercado B3
3. **service-launcher** (3500) - Orquestrador de serviços
4. **firecrawl-proxy** (3600) - Proxy Firecrawl
6. **frontend-dashboard** (3103) - Dashboard React
7. **docusaurus** (3004) - Documentação

**Verificação:**
- ✅ Processo rodando (PID)
- ✅ Porta aberta e listening
- ✅ PID file válido

### Containers Docker (11+)

**Data:**
- data-frontend-apps
- data-timescaledb
- data-questdb
- data-qdrant
- data-postgress-langgraph

**Services:**
- docs-api
- mon-prometheus
- mon-grafana
- firecrawl-api
- infra-langgraph
- infra-langgraph-dev

**Verificação:**
- ✅ Container running
- ✅ Health status (se disponível)
- ✅ Uptime

### Recursos do Sistema

- **CPU:** Uso percentual
- **Memória:** Usado/Total (%)
- **Disco:** Usado/Total (%)
- **Docker:** Containers rodando/total

---

## 🔧 Casos de Uso

### 1. Após Startup

```bash
# Verificar se tudo iniciou corretamente
start && sleep 10 && status-quick
```

### 2. Troubleshooting

```bash
# Monitorar em tempo real durante debug
status-watch
```

### 3. CI/CD

```bash
# Validar que tudo está rodando
if status-quick --json | jq '.status == "ok"'; then
    echo "System is healthy"
else
    echo "System has issues"
    exit 1
fi
```

### 4. Monitoramento Periódico

```bash
# Cron job para verificar status
*/5 * * * * /home/marce/projetos/TradingSystem/status-tradingsystem --json >> /var/log/tradingsystem-status.log
```

### 5. Alertas

```bash
# Script de alerta
STATUS=$(./status-tradingsystem)
if [ $? -ne 0 ]; then
    echo "TradingSystem has issues!" | mail -s "Alert" admin@example.com
fi
```

---

## 🎯 Comparação com Outros Comandos

| Comando | Propósito | Quando Usar |
|---------|-----------|-------------|
| `status` | **Status geral** | Visão completa do sistema |
| `health` | **Health checks** | Validação profunda (testes de conectividade) |
| `docker ps` | **Apenas containers** | Debug específico de Docker |
| `ps aux \| grep node` | **Apenas processos** | Debug específico de serviços |
| `start --help` | **Ajuda de startup** | Opções de inicialização |

**Recomendação:** Use `status` como primeiro comando para diagnóstico!

---

## 🚀 Instalação

### 1. Criar Symlink

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/maintenance/create-root-symlinks.sh
```

**Isso cria:**
- `./status-tradingsystem` → `scripts/startup/status-tradingsystem.sh`

### 2. Atualizar Aliases

```bash
bash scripts/maintenance/update-aliases.sh
source ~/.bashrc  # ou ~/.zshrc
```

**Isso adiciona:**
- `status` - Status completo
- `status-quick` - Resumo rápido
- `status-watch` - Monitoramento contínuo
- `status-services` - Apenas serviços
- `status-docker` - Apenas containers

### 3. Testar

```bash
status-quick
```

---

## 🎓 Exemplos Práticos

### Exemplo 1: Startup e Validação

```bash
# Iniciar sistema
start

# Aguardar 15 segundos
sleep 15

# Validar que tudo está rodando
status-quick
```

### Exemplo 2: Debug de Serviço Específico

```bash
# Ver apenas serviços
status-services

# Se um serviço estiver parado, iniciar manualmente
npm run dev
```

### Exemplo 3: Monitoramento Durante Deploy

```bash
# Terminal 1: Deploy
bash scripts/startup/start-tradingsystem.sh

# Terminal 2: Monitorar
status-watch
```

### Exemplo 4: Integração com Grafana

```bash
# Exportar métricas
status --json > /var/lib/grafana/tradingsystem-status.json

# Grafana pode ler este JSON e criar dashboards
```

---

## 📝 Exit Codes

```bash
status
echo $?  # Imprime exit code
```

| Exit Code | Significado | Ação Recomendada |
|-----------|-------------|------------------|
| `0` | ✅ Tudo OK | Nenhuma ação necessária |
| `1` | ⚠️ Problemas menores (1-3 serviços) | Investigar serviços parados |
| `2` | ❌ Problemas críticos (4+ serviços) | Reiniciar sistema (`stop-force && start`) |

**Uso em scripts:**
```bash
if ! status --quick; then
    echo "System has issues, restarting..."
    stop && start
fi
```

---

## 🆘 Troubleshooting

### "Permission denied"

```bash
chmod +x /home/marce/projetos/TradingSystem/status-tradingsystem
chmod +x /home/marce/projetos/TradingSystem/scripts/startup/status-tradingsystem.sh
```

### "Command not found"

```bash
# Verificar se symlink existe
ls -la /home/marce/projetos/TradingSystem/status-tradingsystem

# Se não existir, criar
bash scripts/maintenance/create-root-symlinks.sh

# Atualizar aliases
bash scripts/maintenance/update-aliases.sh
source ~/.bashrc
```

### Serviços aparecem como "zombie"

**Causa:** Processo existe mas porta não está aberta

**Solução:**
```bash
# Matar processo zombie
kill -9 <PID>

# Reiniciar serviço
cd <service-directory>
npm run dev
```

### Container unhealthy

```bash
# Ver logs do container
docker logs <container-name> --tail 50

# Reiniciar container
docker restart <container-name>
```

---

## 🎉 Resumo

**O comando `status` é seu melhor amigo para:**
- ✅ Verificar se tudo está rodando
- ✅ Identificar problemas rapidamente
- ✅ Monitorar o sistema em tempo real
- ✅ Integrar com automação/CI/CD
- ✅ Debug e troubleshooting

**Comandos essenciais:**
```bash
status              # Status completo
status-quick        # Resumo rápido
status-watch        # Monitoramento contínuo
```

**Completa a tríade de gerenciamento:**
```bash
start    # Inicia tudo
stop     # Para tudo
status   # Verifica tudo
```

---

**Documentação criada:** 2025-10-20  
**Versão:** 1.0.0  
**Status:** ✅ Production ready
