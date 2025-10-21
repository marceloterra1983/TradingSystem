# TradingSystem - Quick Start Guide

> **🚀 Comando Universal de Startup**  
> Execute o TradingSystem completo com um único comando de qualquer diretório!

## ⚡ Instalação (Uma Vez)

Adicione ao seu `~/.bashrc`:

```bash
# TradingSystem - Universal Startup
alias start='bash /home/marce/projetos/TradingSystem/start-tradingsystem'
alias start-docker='bash /home/marce/projetos/TradingSystem/start-tradingsystem --docker'
alias start-services='bash /home/marce/projetos/TradingSystem/start-tradingsystem --services'
alias start-minimal='bash /home/marce/projetos/TradingSystem/start-tradingsystem --minimal'
alias stop='bash /home/marce/projetos/TradingSystem/scripts/services/stop-all.sh && bash /home/marce/projetos/TradingSystem/scripts/docker/stop-stacks.sh'
alias status='bash /home/marce/projetos/TradingSystem/scripts/services/status.sh'
alias health='bash /home/marce/projetos/TradingSystem/scripts/maintenance/health-check-all.sh'
alias logs='tail -f /tmp/tradingsystem-logs/*.log'
```

Depois recarregue:

```bash
source ~/.bashrc
```

## 🎯 Uso Diário

### Iniciar Tudo

```bash
start
```

### Parar Tudo

```bash
stop
```

### Ver Status

```bash
status
```

## 🌐 URLs Principais

Após startup, acesse:

| Serviço           | URL                   | Descrição           |
| ----------------- | --------------------- | ------------------- |
| **Dashboard**     | http://localhost:3103 | Interface principal |
| **Documentação**  | http://localhost:3004 | Docusaurus          |
| **Workspace API** | http://localhost:3200 | API de workspace    |
| **QuestDB UI**    | http://localhost:9009 | Banco de dados      |
| **Grafana**       | http://localhost:3000 | Monitoramento       |

## 🔧 Opções Avançadas

```bash
# Apenas containers Docker
start-docker

# Apenas serviços Node.js
start-services

# Modo mínimo (essenciais)
start-minimal

# Force restart (mata processos em portas ocupadas)
start --force-kill

# Health check completo
health

# Ver logs
logs
```

## 📚 Documentação Completa

-   **[Startup Scripts](scripts/startup/README.md)** - Documentação detalhada
-   **[Service Startup Guide](docs/context/ops/service-startup-guide.md)** - Guia de inicialização
-   **[Health Monitoring](docs/context/ops/health-monitoring.md)** - Monitoramento
-   **[CLAUDE.md](CLAUDE.md)** - Guia completo do projeto

## 🐛 Problemas Comuns

### Porta Ocupada

```bash
ts-start --force-kill
```

### Serviço Não Inicia

```bash
tail -n 50 /tmp/tradingsystem-logs/<service-name>.log
```

### Docker Não Responde

```bash
docker ps
sudo systemctl restart docker
```

---

**Pronto!** Agora você pode iniciar o TradingSystem completo de qualquer lugar com um único comando. 🎉

