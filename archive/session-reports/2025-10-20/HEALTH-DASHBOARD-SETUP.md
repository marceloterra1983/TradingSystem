# 🏥 Health Dashboard - Setup Guide

## Quick Start (Execute este comando)

```bash
cd /home/marce/projetos/TradingSystem
bash scripts/docs/run-all-health-tests.sh
```

Este comando irá:
- ✅ Verificar porta 3004
- ✅ Verificar e iniciar Documentation API (port 3400)
- ✅ Validar arquivos do Health Dashboard
- ✅ Limpar cache do Docusaurus
- ✅ Testar todos os endpoints da API
- ✅ Preparar Docusaurus para iniciar

## Depois de executar o script acima

### Iniciar Docusaurus (escolha uma opção):

**Opção 1 - Usando script:**
```bash
bash scripts/docs/start-docusaurus-health.sh
```

**Opção 2 - Manual:**
```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
npm run start -- --port 3004
```

### Acessar Dashboard

Após ver a mensagem `[SUCCESS] Docusaurus website is running...`, acesse:

- 🏥 **Health Dashboard**: http://localhost:3004/health
- 🏠 **Home**: http://localhost:3004/
- 📚 **Docs**: http://localhost:3004/docs/intro

## Troubleshooting

### Se a página /health não carregar:

1. **Verificar console do navegador (F12)**
   - Abra DevTools
   - Vá para aba Console
   - Cole os erros aqui

2. **Verificar se Docusaurus está rodando:**
   ```bash
   lsof -i :3004
   ```

3. **Verificar logs do terminal** onde executou `npm run start`
   - Procure erros em vermelho
   - Cole toda a saída aqui

4. **Tentar build de produção:**
   ```bash
   cd /home/marce/projetos/TradingSystem/docs/docusaurus
   npm run build
   npm run serve -- --port 3004
   ```

### Se a API não responder:

```bash
# Ver logs do container
docker logs docs-documentation-api

# Restart
docker compose -f infrastructure/compose/docker-compose.docs.yml restart documentation-api

# Testar manualmente
curl http://localhost:3400/health
```

## Verificações Implementadas

✅ **Comment 1**: Routes montadas em `/api/v1/docs/health`
✅ **Comment 2**: Endpoint `/metrics` exposto para Prometheus
✅ **Comment 3**: Registries unificados (prom-client.register)
✅ **Comment 4**: Docusaurus usa `customFields` ao invés de `process.env`
✅ **Comment 5**: Trends endpoint conectado ao Prometheus
✅ **Comment 6**: Graceful degradation quando sem dados de audit
✅ **Comment 7**: CI workflow calcula `health_score` corretamente

## Estrutura de Arquivos

```
docs/docusaurus/
├── src/
│   ├── pages/
│   │   └── health/
│   │       ├── index.tsx          ← Página principal
│   │       └── styles.module.css  ← Estilos
│   └── components/
│       └── HealthMetricsCard/
│           ├── index.tsx           ← Componente de métricas
│           └── styles.module.css   ← Estilos
└── docusaurus.config.ts            ← Config (customFields)

backend/api/documentation-api/
├── src/
│   ├── routes/
│   │   └── docs-health.js          ← Routes de health
│   ├── services/
│   │   ├── docsHealthMetrics.js    ← Métricas Prometheus
│   │   └── searchMetrics.js        ← Métricas de busca
│   ├── metrics.js                  ← Registry Prometheus
│   └── server.js                   ← Server (routes montadas)
└── config/
    └── appConfig.js                ← Config Prometheus URL
```

## Endpoints Disponíveis

### Documentation API (port 3400)

| Endpoint | Descrição |
|----------|-----------|
| `GET /health` | Health check básico |
| `GET /metrics` | Métricas Prometheus |
| `GET /api/v1/docs/health/summary` | Resumo de saúde |
| `GET /api/v1/docs/health/metrics` | Métricas detalhadas |
| `GET /api/v1/docs/health/issues?type=links` | Lista de issues |
| `GET /api/v1/docs/health/trends?days=30` | Tendências históricas |
| `POST /api/v1/docs/health/update-metrics` | Atualizar métricas (CI) |

### Docusaurus (port 3004)

| URL | Descrição |
|-----|-----------|
| http://localhost:3004/ | Home |
| http://localhost:3004/health | Health Dashboard |
| http://localhost:3004/docs/intro | Documentação |

## Scripts Disponíveis

| Script | Função |
|--------|--------|
| `scripts/docs/run-all-health-tests.sh` | Executa todos os testes |
| `scripts/docs/troubleshoot-health-dashboard.sh` | Diagnóstico completo |
| `scripts/docs/test-health-api.sh` | Testa endpoints da API |
| `scripts/docs/start-docusaurus-health.sh` | Inicia Docusaurus |

## Precisa de Ajuda?

Execute o diagnóstico completo e me envie a saída:

```bash
bash scripts/docs/run-all-health-tests.sh 2>&1 | tee health-diagnostic.log
```

Depois compartilhe o arquivo `health-diagnostic.log`
