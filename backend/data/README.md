# 💾 Backend Data Layer

> **Central de dados do TradingSystem** - Schemas, migrations, backups e runtime data
>
> **Última atualização:** 2025-10-15  
> **Versão:** 2.1.0

---

## 📁 Estrutura de Diretórios

```
backend/data/
├── backups/             # Database backups (timestamped)
│   └── library/         # Library DB backups
│       └── YYYYMMDD_HHMMSS/
│
├── runtime/             # Runtime data (unificado em v2.1)
│   ├── context7/        # Context7 AI runtime data
│   ├── exa/             # Exa search cache
│   └── langgraph/       # LangGraph execution data
│
└── schemas/             # Data schemas & migrations
    └── documentation/   # Documentation schema definitions
```

---

## 🎯 Propósito de Cada Pasta

### `/backend/data/backups/`
**Descrição:** Backups automatizados e manuais dos bancos de dados

**Conteúdo:**
- **library/** - Backups da Workspace (LowDB)
  - Formato: `YYYYMMDD_HHMMSS/ideas.json`
  - Retenção: 14 dias (configurável)
  - Frequência: Diária via cron

**Uso:**
```bash
# Restaurar backup
cp backend/data/backups/library/20251012_003939/ideas.json \
   backend/api/workspace/db/ideas.json
```

### `/backend/data/runtime/`
**Descrição:** Dados de runtime de serviços AI/ML e ferramentas (NOVO em v2.1)

**Conteúdo:**
- **context7/** - Runtime data do Context7 AI
- **exa/** - Cache de buscas do Exa
- **langgraph/** - Dados de execução do LangGraph
  - Workflows em progresso
  - State snapshots
  - Execution logs

**Nota:** Esta pasta unifica os dados que antes estavam em `/data/` na raiz

### `/backend/data/schemas/`
**Descrição:** Definições de schemas, DDL e documentação de estruturas de dados

**Conteúdo:**
- **documentation/** - Schemas da Documentation API

**Referência:**
- Para schemas completos, veja: `docs/context/backend/data/schemas/`
- Inclui: trading-core, analytics, logging

---

## 📊 Dados Armazenados por Tecnologia

### LowDB (JSON Files)
- **Localização:** `backend/api/*/db/`
- **Uso:** MVP storage para Idea Bank e Documentation API
- **Arquivos:**
  - `backend/api/workspace/db/ideas.json`
  - `backend/api/documentation-api/db/db.json`
- **Backups:** `backend/data/backups/library/`

### QuestDB (Time-Series)
- **Localização:** Container Docker (volume persistente)
- **Uso:** TP Capital signals, market data
- **Tabelas:**
  - `tp_capital_signals`
  - `tp_capital_signals_deleted`
  - `telegram_bots`
  - `telegram_channels`
- **Schema:** `docs/context/backend/data/schemas/trading-core/tables/tp-capital-signals.md`

### TimescaleDB (PostgreSQL)
- **Localização:** Container Docker (volume persistente)
- **Uso:** Analytical layer, reporting
- **Schema:** Planejado (migration em progresso)
- **Porta:** 5433

### Parquet Files (Planejado)
- **Localização:** `backend/data/warehouse/parquet/` (futuro)
- **Uso:** Historical market data
- **Estrutura:** `<symbol>/<YYYY>/<MM>/<DD>.parquet`

### Runtime Data
- **Localização:** `backend/data/runtime/`
- **Uso:** AI/ML services execution data
- **Persistência:** Local filesystem

---

## 🔄 Changelog

### v2.1 (2025-10-15) - Data Unification
- ✅ **Unificado:** Movido `/data/` raiz para `backend/data/runtime/`
- ✅ **Removido:** Flowise (eliminado do projeto)
- ✅ **Organizado:** context7, exa, langgraph em `runtime/`
- ✅ **Atualizado:** Docker volumes e referências

### v2.0 (2025-10-14)
- Estrutura inicial com backups/ e schemas/
- Documentação em docs/context/backend/data/

---

## 📚 Documentação Relacionada

### Schemas & Migrações
- **Schema Index:** `docs/context/backend/data/schemas/README.md`
- **Migrations:** `docs/context/backend/data/migrations/README.md`
- **Trading Core Tables:** `docs/context/backend/data/schemas/trading-core/tables/`

### Operations
- **Backup & Restore:** `docs/context/backend/data/operations/backup-restore.md`
- **Retention Policy:** `docs/context/backend/data/operations/retention-policy.md`
- **Data Quality:** `docs/context/backend/data/operations/data-quality-runbook.md`
- **QuestDB + TimescaleDB:** `docs/context/backend/data/operations/questdb-timescaledb-dual-storage.md`

### Data Warehouse
- **Parquet Layout:** `docs/context/backend/data/warehouse/parquet-layout.md`
- **Timeseries Aggregation:** `docs/context/backend/data/warehouse/timeseries-aggregation.md`

---

## 🎯 Manutenção

### Backups
```bash
# Backup manual da Workspace
mkdir -p backend/data/backups/library/$(date +%Y%m%d_%H%M%S)
cp backend/api/workspace/db/ideas.json \
   backend/data/backups/library/$(date +%Y%m%d_%H%M%S)/

# Limpar backups antigos (manter últimos 14 dias)
find backend/data/backups/library/ -type d -mtime +14 -exec rm -rf {} \;
```

### Limpeza
```bash
# Limpar dados de runtime antigos
find backend/data/runtime/ -type f -mtime +30 -delete

# Verificar tamanho dos dados
du -sh backend/data/*
```

---

## 🔐 Segurança

- **Não versionar:** Arquivos em `runtime/` (exceto estrutura de pastas)
- **Backups:** Incluir em `.gitignore`
- **Schemas:** Versionar e documentar todas as mudanças
- **Migrations:** Sempre testar em staging primeiro

---

**Responsável:** Data Engineering & Backend Team  
**Status:** ✅ Atualizado e Testado



