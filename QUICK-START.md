# TradingSystem - Quick Start

## 🚀 Comandos Rápidos

### Iniciar Tudo
```bash
bash /workspace/scripts/docker/startup-all.sh
```

### Parar Tudo
```bash
bash /workspace/scripts/docker/shutdown-all.sh
```

### Validar Serviços
```bash
bash /workspace/scripts/docker/validate-traefik-routers.sh
```

---

## 🌐 URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Dashboard** | http://localhost:9082/ | Interface principal |
| **Documentação** | http://localhost:9082/docs/ | Docusaurus v3 |
| **Traefik** | http://localhost:9083/dashboard/ | Monitoramento do Gateway |
| **Workspace API** | http://localhost:9082/api/workspace/* | API de workspace |
| **TP Capital API** | http://localhost:9082/api/tp-capital/* | API de trading signals |
| **Docs API** | http://localhost:9082/api/docs/* | API de documentação |

---

## 📋 Ordem de Startup (Automática)

1. **Redes Docker** (criadas automaticamente)
2. **Database Stack** (~10s)
3. **TP Capital Stack** (~5s)
4. **Workspace Stack** (~5s)
5. **Telegram Stack** (12 containers, ~10s)
6. **API Gateway (Traefik)** (~5s)
7. **Dashboard** (~5s)
8. **Documentação** (~3s)
9. **Serviços Opcionais** (N8N, Kestra, Firecrawl)

**Tempo total:** ~50 segundos + 30s para health checks

---

## 🔍 Verificação Rápida

```bash
# Ver containers rodando
docker ps --format "table {{.Names}}\t{{.Status}}"

# Ver routers do Traefik
docker exec api-gateway curl -s http://localhost:8080/api/http/routers | jq 'keys'

# Testar Dashboard
curl -I http://localhost:9082/

# Testar Documentação
curl -I http://localhost:9082/docs/
```

---

## 📚 Documentação Completa

- **Guia Completo de Shutdown/Startup:** [SHUTDOWN-STARTUP-GUIDE.md](SHUTDOWN-STARTUP-GUIDE.md)
- **Correção de Middlewares:** [TRAEFIK-MIDDLEWARE-FIX-SUMMARY.md](TRAEFIK-MIDDLEWARE-FIX-SUMMARY.md)
- **Guia de Acesso ao Dashboard:** [DASHBOARD-ACCESS-GUIDE.md](DASHBOARD-ACCESS-GUIDE.md)
- **CLAUDE.md:** Instruções completas para AI assistants

---

## 🐛 Troubleshooting Rápido

### Dashboard sem CSS?
```bash
# Verificar baseUrl
grep "baseUrl" /workspace/docs/docusaurus.config.js
# Deve mostrar: baseUrl: '/docs/',

# Rebuildar se necessário
cd /workspace/docs && npm run build
docker cp /workspace/docs/build/. docs-hub:/usr/share/nginx/html/
```

### Porta já em uso?
```bash
# Verificar processos
sudo lsof -i :9082
sudo lsof -i :9083

# Matar se necessário
sudo lsof -ti :9082 | xargs sudo kill -9
```

### Rede não existe?
```bash
docker network create tradingsystem_backend
docker network create tradingsystem_frontend
docker network create tp_capital_backend
```

---

**Última Atualização:** 2025-11-12
**Versão:** 1.0
