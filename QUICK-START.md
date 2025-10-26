# 🚀 TradingSystem - Quick Start Guide

Guia rápido para iniciar e gerenciar o TradingSystem.

## ⚡ Instalação Inicial (Executar Uma Vez)

```bash
cd /home/marce/Projetos/TradingSystem
bash install-shortcuts.sh
source ~/.bashrc  # ou: exec $SHELL
```

## 📋 Comandos Essenciais

### Iniciar Sistema
```bash
start
```

### Parar Sistema
```bash
stop
```

### Ver Status
```bash
status
```

### Opções Avançadas
```bash
# Forçar reinício (mata processos existentes)
start --force-kill

# Parar com força
stop --force

# Parar e limpar logs
stop --clean-logs
```

## 🌐 URLs dos Serviços

| Serviço | URL | Porta |
|---------|-----|-------|
| Dashboard | http://localhost:3103 | 3103 |
| Workspace API | http://localhost:3200 | 3200 |
| Documentation API | http://localhost:3400 | 3400 |
| Status API | http://localhost:3500 | 3500 |
| TP-Capital | http://localhost:4005 | 4005 |
| Firecrawl Proxy | http://localhost:3600 | 3600 |

## 📊 Health Checks

```bash
# Workspace API
curl http://localhost:3200/health

# Status API
curl http://localhost:3500/api/status

# TP-Capital
curl http://localhost:4005/health
```

## 📝 Ver Logs

```bash
# Dashboard
tail -f logs/services/dashboard.log

# Workspace API
tail -f logs/services/workspace.log

# Status API
tail -f logs/services/status.log

# TP-Capital
tail -f logs/services/tp-capital.log

# Todos os logs
tail -f logs/services/*.log
```

## 🐳 Docker Containers

Os containers Docker são gerenciados separadamente:

```bash
# Ver containers rodando
docker ps

# Iniciar containers (se necessário)
bash scripts/docker/start-stacks.sh

# Parar containers
bash scripts/docker/stop-stacks.sh
```

## 🔄 Workflow Diário

**Manhã (Iniciar trabalho):**
```bash
start
```

**Durante o dia (Verificar status):**
```bash
status
```

**Noite (Finalizar trabalho):**
```bash
stop
```

## 🆘 Troubleshooting

### Porta ocupada
```bash
start --force-kill
```

### Serviço não inicia
```bash
# Ver logs do serviço específico
tail -f logs/services/workspace.log

# Verificar se porta está livre
lsof -i :3200
```

### Reiniciar tudo
```bash
stop && sleep 2 && start
```

### Limpar logs e reiniciar
```bash
stop --clean-logs
start
```

## 🔧 Configuração

As configurações estão nos arquivos:
- `.env` - Configurações principais
- `.env.local` - Overrides locais
- `config/.env.defaults` - Valores padrão

**Variáveis importantes:**
```bash
TIMESCALEDB_PORT=5433
WORKSPACE_PORT=3200
```

## 📖 Documentação Completa

- **Scripts Universais**: `scripts/universal/README.md`
- **Guia Claude**: `CLAUDE.md`
- **Estrutura do Projeto**: `docs/DIRECTORY-STRUCTURE.md`

## 💡 Dicas

1. **Use `status` frequentemente** para verificar se todos os serviços estão rodando
2. **Logs são seus amigos** - sempre verifique logs quando algo der errado
3. **Docker containers** devem estar rodando antes de iniciar os serviços Node.js
4. **Force kill** só quando necessário - use `stop` normal primeiro

## ✅ Checklist Rápido

- [ ] Instalei os shortcuts (`bash install-shortcuts.sh`)
- [ ] Recarreguei o shell (`source ~/.bashrc`)
- [ ] Docker containers estão rodando (`docker ps`)
- [ ] Iniciei os serviços (`start`)
- [ ] Verifiquei o status (`status`)
- [ ] Acessei o Dashboard (http://localhost:3103)

---

**Pronto!** Agora você tem controle total do TradingSystem com comandos simples. 🎉

