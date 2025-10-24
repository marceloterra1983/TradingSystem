# 🚀 Applications - TradingSystem

**Diretório para aplicações e serviços do TradingSystem.**

---

## 📁 Estrutura

```
apps/
├── README.md                    ✅ Este arquivo - Visão geral das aplicações
├── tp-capital/                  📡 TP Capital API (Port 4005)
├── b3-market-data/              📊 B3 Market Data API (Port 3302)
├── workspace/                   💼 Workspace API (Port 3200)
├── status/                      📈 Status/Launcher API (Port 3500)
└── firecrawl/                   🌐 Firecrawl Stack (Port 3002)
```

---

## 🎯 Aplicações Disponíveis

### 1. TP Capital API (Port 4005)
**Localização:** `apps/tp-capital/`  
**Status:** ✅ Production Ready  
**Funcionalidade:** Ingestão de sinais de opções via Telegram

**Características:**
- 📡 **Telegram Bot Integration** - Conecta com canais TP Capital
- 📊 **Signal Processing** - Processa sinais de opções em tempo real
- 💾 **QuestDB Storage** - Armazena sinais e logs
- 🔄 **Real-time Updates** - WebSocket para dashboard

### 2. B3 Market Data API (Port 3302)
**Localização:** `apps/b3-market-data/`  
**Status:** ✅ Production Ready  
**Funcionalidade:** Dados de mercado brasileiro

**Características:**
- 📈 **Market Data** - Dados de ações, opções, índices
- 🔄 **Real-time Updates** - Dados em tempo real
- 📊 **Analytics** - Indicadores e métricas
- 💾 **Time-series Storage** - QuestDB para dados históricos

### 3. Workspace API (Port 3200)
**Localização:** `apps/workspace/`  
**Status:** ✅ Production Ready  
**Funcionalidade:** Gestão de workspace e items

**Características:**
- 📝 **Items CRUD** - Gerenciamento de items
- 🏷️ **Categorização** - 6 categorias de sistemas
- 🎯 **Priorização** - 4 níveis de prioridade
- 📊 **Status Tracking** - 5 estados de progresso

### 4. Status/Launcher API (Port 3500)
**Localização:** `apps/status/`  
**Status:** ✅ Production Ready  
**Funcionalidade:** Monitoramento e launcher de serviços

**Características:**
- 📊 **Health Monitoring** - Status de todos os serviços
- 🚀 **Service Launcher** - Inicialização de serviços
- 📈 **Metrics Aggregation** - Métricas consolidadas
- 🔄 **Auto-recovery** - Recuperação automática

### 5. Firecrawl Stack (Port 3002)
**Localização:** `apps/firecrawl/`  
**Status:** ✅ Production Ready  
**Funcionalidade:** Web scraping e crawling

**Características:**
- 🌐 **Web Scraping** - Extração de dados web
- 📄 **Content Processing** - Processamento de conteúdo
- 🔄 **Crawl Jobs** - Jobs de crawling
- 📊 **Structured Data** - Dados estruturados

---

## 🚀 Quick Start

### Iniciar Todas as Aplicações
```bash
# Via script automatizado
bash scripts/startup/start-dashboard-stack.sh

# Ou individualmente
cd apps/tp-capital && npm start
cd apps/b3-market-data && npm start
cd apps/workspace && npm start
cd apps/status && npm start
```

### Verificar Status
```bash
# Health checks
curl http://localhost:4005/health  # TP Capital
curl http://localhost:3302/health  # B3 Market
curl http://localhost:3200/health  # Workspace
curl http://localhost:3500/health  # Status/Launcher
curl http://localhost:3002/health  # Firecrawl
```

### Parar Todas as Aplicações
```bash
bash scripts/shutdown/stop-dashboard-stack.sh
```

---

## 📊 Portas e Serviços

| Aplicação | Porta | Tipo | Database | Status |
|-----------|-------|------|----------|--------|
| **TP Capital** | 4005 | API | QuestDB | ✅ Production |
| **B3 Market Data** | 3302 | API | QuestDB | ✅ Production |
| **Workspace** | 3200 | API | TimescaleDB | ✅ Production |
| **Status/Launcher** | 3500 | API | - | ✅ Production |
| **Firecrawl** | 3002 | Stack | PostgreSQL | ✅ Production |

---

## 🔧 Configuração

### Variáveis de Ambiente
Todas as aplicações usam o arquivo `.env` centralizado na raiz do projeto:

```env
# TP Capital
TP_CAPITAL_API_PORT=4005
TP_CAPITAL_TELEGRAM_BOT_TOKEN=your-bot-token

# B3 Market Data
B3_MARKET_API_PORT=3302
B3_MARKET_DATA_SOURCE=your-data-source

# Workspace
WORKSPACE_API_PORT=3200
WORKSPACE_DATABASE_URL=postgresql://...

# Status/Launcher
STATUS_API_PORT=3500
LAUNCHER_SERVICES_CONFIG=config/services-manifest.json

# Firecrawl
FIRECRAWL_API_PORT=3002
FIRECRAWL_DATABASE_URL=postgresql://...
```

### Service Manifest
Configuração centralizada em `config/services-manifest.json`:

```json
{
  "services": [
    {
      "id": "tp-capital-api",
      "type": "api",
      "path": "apps/tp-capital",
      "port": 4005,
      "start": "npm start",
      "managed": "internal"
    }
  ]
}
```

---

## 🧪 Testing

### Testes Individuais
```bash
# TP Capital
cd apps/tp-capital && npm test

# B3 Market Data
cd apps/b3-market-data && npm test

# Workspace
cd apps/workspace && npm test

# Status/Launcher
cd apps/status && npm test
```

### Testes de Integração
```bash
# Testar todas as APIs
bash scripts/maintenance/health-check-all.sh

# Testar conectividade
bash scripts/maintenance/test-api-connectivity.sh
```

---

## 📊 Monitoramento

### Métricas Prometheus
Todas as aplicações expõem métricas em `/metrics`:

```bash
curl http://localhost:4005/metrics  # TP Capital
curl http://localhost:3302/metrics  # B3 Market
curl http://localhost:3200/metrics  # Workspace
curl http://localhost:3500/metrics  # Status/Launcher
```

### Logs Estruturados
Todas usam Pino para logging estruturado:

```bash
# Development (pretty print)
npm run dev

# Production (JSON)
NODE_ENV=production npm start
```

---

## 🔗 Integrações

### Frontend Dashboard
```typescript
// Proxies configurados no Vite
'/api/tp-capital' → http://localhost:4005
'/api/b3' → http://localhost:3302
'/api/workspace' → http://localhost:3200
'/api/launcher' → http://localhost:3500
'/api/firecrawl' → http://localhost:3002
```

### Databases
- **QuestDB** - Time-series data (TP Capital, B3 Market)
- **TimescaleDB** - Relational data (Workspace)
- **PostgreSQL** - Firecrawl metadata

---

## 🛠️ Desenvolvimento

### Adicionar Nova Aplicação
1. Criar pasta em `apps/nova-aplicacao/`
2. Adicionar ao `config/services-manifest.json`
3. Configurar variáveis no `.env`
4. Implementar health check
5. Adicionar métricas Prometheus
6. Documentar no README.md

### Padrões de Código
- **Node.js 18+** com ES modules
- **Express.js** para APIs REST
- **Pino** para logging estruturado
- **prom-client** para métricas
- **Health checks** em `/health`
- **OpenAPI specs** para documentação

---

## 📚 Documentação Relacionada

- **Service Manifest:** [`config/services-manifest.json`](../config/services-manifest.json)
- **Environment Rules:** [`config/ENV-CONFIGURATION-RULES.md`](../config/ENV-CONFIGURATION-RULES.md)
- **Backend Guide:** [`backend/README.md`](../backend/README.md)
- **Scripts Guide:** [`scripts/README.md`](../scripts/README.md)

---

## 🎯 Roadmap

### Concluído ✅
- ✅ TP Capital API com Telegram integration
- ✅ B3 Market Data API com time-series storage
- ✅ Workspace API com TimescaleDB
- ✅ Status/Launcher API com health monitoring
- ✅ Firecrawl Stack com PostgreSQL

### Futuro 📋
- [ ] Microservices communication (gRPC)
- [ ] Event-driven architecture (Kafka/RabbitMQ)
- [ ] Service mesh (Istio)
- [ ] Auto-scaling (Kubernetes)
- [ ] Circuit breakers (Hystrix)

---

**Última Atualização:** 23 de Outubro de 2025  
**Total de Aplicações:** 5  
**Status Geral:** ✅ Production Ready  
**Arquitetura:** Microservices + APIs REST


