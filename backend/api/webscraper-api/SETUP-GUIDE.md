# WebScraper API - Setup Guide

## 🎯 Quick Start

Esta é a configuração passo a passo para inicializar o **webscraper-api** pela primeira vez.

## 📋 Pré-requisitos

1. ✅ Container `data-frontend-apps` rodando
2. ✅ Node.js 20+ instalado
3. ✅ Variáveis de ambiente configuradas no `.env` raiz

## 🔧 Passo a Passo

### 1. Verificar Container do Banco

```bash
# Verificar se o container está rodando
docker ps | grep data-frontend-apps

# Se não estiver, iniciar:
docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml up -d

# Aguardar healthcheck (10-20 segundos)
docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml ps
```

### 2. Adicionar Variáveis ao `.env` Raiz

**Abra o arquivo:** `/home/marce/projetos/TradingSystem/.env`

**Adicione as seguintes variáveis:**

```bash
# ============================================================================
# WebScraper API Configuration
# ============================================================================
WEBSCRAPER_API_PORT=3700
WEBSCRAPER_DATABASE_URL=postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper
WEBSCRAPER_FIRECRAWL_PROXY_URL=http://localhost:3600

# Scheduler (opcional - default: disabled)
WEBSCRAPER_SCHEDULER_ENABLED=false

# Export (opcional - defaults funcionam bem)
WEBSCRAPER_EXPORT_ENABLED=true
WEBSCRAPER_EXPORT_DIR=/tmp/webscraper-exports

# Logging
WEBSCRAPER_LOG_LEVEL=info

# CORS
WEBSCRAPER_CORS_ORIGIN=http://localhost:3103,http://localhost:3004
```

### 3. Executar Setup Automático

```bash
cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api

# Tornar script executável
chmod +x scripts/setup-webscraper.sh

# Executar setup completo
bash scripts/setup-webscraper.sh
```

**O script vai:**
- ✅ Verificar se o container está rodando
- ✅ Criar o usuário `app_webscraper` no PostgreSQL
- ✅ Criar o schema `webscraper`
- ✅ Conceder permissões necessárias
- ✅ Gerar o Prisma client
- ✅ Executar migrations (criar tabelas)
- ✅ Validar a instalação

### 4. Instalar Dependências (Se Necessário)

```bash
cd /home/marce/projetos/TradingSystem/backend/api/webscraper-api
npm install
```

### 5. Iniciar o Serviço

```bash
# Modo development (com hot reload)
npm run dev

# Ou modo production
npm start
```

### 6. Validar Funcionamento

```bash
# Health check
curl http://localhost:3700/health | jq

# Esperado:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-20T...",
#   "database": "connected",
#   "version": "1.0.0"
# }

# Listar jobs (deve retornar array vazio)
curl http://localhost:3700/api/v1/jobs | jq

# Listar templates (deve retornar array vazio)
curl http://localhost:3700/api/v1/templates | jq
```

## 🔍 Troubleshooting

### Erro: "Container not running"

```bash
# Verificar logs do container
docker logs data-frontend-apps --tail 50

# Reiniciar o container
docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml restart

# Se necessário, recriar
docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml down
docker compose -f infrastructure/compose/docker-compose.frontend-apps.yml up -d
```

### Erro: "Cannot connect to database"

```bash
# Verificar conectividade
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -c "\l"

# Verificar se o usuário existe
docker exec data-frontend-apps psql -U frontend_admin -d frontend_apps -c "\du app_webscraper"

# Re-executar setup SQL
docker exec -i data-frontend-apps psql -U frontend_admin -d frontend_apps < scripts/setup-database.sql
```

### Erro: "Prisma migration failed"

```bash
# Verificar status das migrations
npx prisma migrate status

# Forçar reset (CUIDADO: apaga dados!)
WEBSCRAPER_DATABASE_URL="postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper" \
  npx prisma migrate reset --force

# Re-aplicar migrations
WEBSCRAPER_DATABASE_URL="postgresql://app_webscraper:app_webscraper_dev_password@localhost:5444/frontend_apps?schema=webscraper" \
  npx prisma migrate deploy
```

### Erro: "Port 3700 already in use"

```bash
# Verificar o que está usando a porta
lsof -i :3700
# ou
netstat -tulpn | grep 3700

# Matar processo
kill -9 <PID>

# Ou mudar a porta no .env
WEBSCRAPER_API_PORT=3701
```

## 📊 Verificar Estrutura do Banco

```bash
# Conectar ao banco
docker exec -it data-frontend-apps psql -U app_webscraper -d frontend_apps

# Listar schemas
\dn

# Usar schema webscraper
SET search_path TO webscraper;

# Listar tabelas
\dt

# Verificar estrutura de uma tabela
\d scrape_jobs

# Sair
\q
```

## 🎯 Próximos Passos

Após o setup bem-sucedido:

1. **Testar CRUD de Templates**
   ```bash
   # Criar template
   curl -X POST http://localhost:3700/api/v1/templates \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Example Template",
       "description": "Test template",
       "options": {"format": "markdown"}
     }'
   ```

2. **Testar Criação de Jobs**
   ```bash
   # Criar job
   curl -X POST http://localhost:3700/api/v1/jobs \
     -H "Content-Type: application/json" \
     -d '{
       "type": "scrape",
       "url": "https://example.com",
       "status": "completed",
       "options": {"format": "markdown"},
       "results": {"content": "Test content"}
     }'
   ```

3. **Verificar Métricas**
   ```bash
   curl http://localhost:3700/metrics
   ```

4. **Integrar com Frontend**
   - O WebScraper frontend (`frontend/apps/WebScraper`) já está configurado para usar esta API
   - Certifique-se de que o frontend está apontando para `http://localhost:3700`

## 📚 Documentação Adicional

- **README principal**: `backend/api/webscraper-api/README.md`
- **API Endpoints**: Seção "Endpoints" no README
- **Scheduler**: Seção "Scheduler Service" no README
- **Exports**: Seção "Exports API" no README
- **Prisma Schema**: `prisma/schema.prisma`

## 🆘 Suporte

Se encontrar problemas não cobertos neste guia:

1. Verificar logs do serviço: `/tmp/tradingsystem-logs/webscraper-api.log`
2. Verificar logs do container: `docker logs data-frontend-apps`
3. Consultar documentação do Prisma: https://www.prisma.io/docs
4. Criar issue no repositório com logs detalhados
