---
title: Migração da Estrutura de Banco de Dados
sidebar_position: 5
tags: [data, database, migration, timescaledb, guide]
domain: backend
type: guide
summary: Guia completo sobre a nova estrutura organizada de bancos de dados do TradingSystem
status: active
last_review: 2025-10-24
---

# Migração da Estrutura de Banco de Dados

## Visão Geral

Este documento descreve a reestruturação dos bancos de dados do TradingSystem para uma organização mais clara e mantível.

## Estrutura Anterior

```
Container: data-timescaledb
│
├── Database: tradingsystem
│   └── Schema: public
│       ├── tp_capital_signals
│       ├── telegram_bots
│       └── telegram_channels
│
└── Database: frontend_apps
    └── Schema: workspace
        ├── workspace_items
        ├── workspace_audit_log
        └── schema_version
```

## Nova Estrutura

```
Container: data-timescaledb
│
├── Database: APPS-TPCAPITAL
│   └── Schema: tp-capital
│       ├── tp_capital_signals
│       ├── telegram_bots
│       └── telegram_channels
│
└── Database: APPS-WORKSPACE
    └── Schema: workspace
        ├── workspace_items
        ├── workspace_audit_log
        └── schema_version
```

## Benefícios da Nova Estrutura

### 1. Nomenclatura Consistente
- ✅ Prefixo `APPS-` identifica claramente bancos de aplicações
- ✅ Nomes descritivos e padronizados
- ✅ Facilita identificação em logs e monitoramento

### 2. Isolamento Melhorado
- ✅ Cada aplicação tem seu próprio banco de dados
- ✅ Schemas específicos por domínio
- ✅ Menor risco de conflitos entre aplicações

### 3. Gestão Facilitada
- ✅ Backups individuais por aplicação
- ✅ Restore seletivo
- ✅ Políticas de retenção independentes

### 4. Escalabilidade
- ✅ Possibilidade de mover bancos para servidores dedicados
- ✅ Otimizações específicas por workload
- ✅ Monitoramento granular

## Executando a Migração

### Pré-requisitos

1. Container `data-timescaledb` em execução
2. Backups atualizados dos bancos existentes
3. Aplicações paradas durante a migração

### Passo a Passo

#### 1. Parar as Aplicações

```bash
# Parar TP-CAPITAL
cd apps/tp-capital
npm run stop  # ou Ctrl+C no processo

# Parar WORKSPACE
cd backend/api/workspace
npm run stop  # ou Ctrl+C no processo
```

#### 2. Executar o Script de Migração

```bash
cd /home/marce/Projetos/TradingSystem
./scripts/database/migrate-database-structure.sh
```

O script irá:
- ✅ Verificar a existência dos bancos de origem
- ✅ Criar backups automáticos
- ✅ Criar novos bancos com a estrutura correta
- ✅ Migrar todos os dados
- ✅ Criar índices e triggers
- ✅ Validar a integridade dos dados
- ✅ Gerar script de rollback

#### 3. Verificar a Migração

```bash
# Verificar APPS-TPCAPITAL
docker exec data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c \
  "SELECT COUNT(*) FROM \"tp-capital\".tp_capital_signals;"

# Verificar APPS-WORKSPACE
docker exec data-timescaledb psql -U timescale -d "APPS-WORKSPACE" -c \
  "SELECT COUNT(*) FROM workspace.workspace_items;"
```

#### 4. Iniciar as Aplicações

```bash
# Iniciar TP-CAPITAL
cd apps/tp-capital
npm run dev

# Iniciar WORKSPACE
cd backend/api/workspace
npm run dev
```

#### 5. Testar as Aplicações

**TP-CAPITAL:**
```bash
# Health check
curl http://localhost:4005/health

# Listar sinais
curl http://localhost:4005/signals
```

**WORKSPACE:**
```bash
# Health check
curl http://localhost:3200/health

# Listar itens
curl http://localhost:3200/api/library
```

#### 6. Remover Bancos Antigos (Após Validação)

⚠️ **ATENÇÃO**: Execute apenas após confirmar que tudo funciona!

```bash
# Remover banco antigo do TP-CAPITAL
docker exec data-timescaledb psql -U timescale -d postgres -c \
  "DROP DATABASE tradingsystem;"

# Remover banco antigo do WORKSPACE
docker exec data-timescaledb psql -U timescale -d postgres -c \
  "DROP DATABASE frontend_apps;"
```

## Configurações das Aplicações

### TP-CAPITAL

**Arquivo**: `apps/tp-capital/src/config.js`

```javascript
timescale: {
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: Number(process.env.TIMESCALEDB_PORT || 5433),
  database: process.env.TIMESCALEDB_DATABASE || 'APPS-TPCAPITAL',
  schema: process.env.TIMESCALEDB_SCHEMA || 'tp-capital',
  user: process.env.TIMESCALEDB_USER || 'timescale',
  password: process.env.TIMESCALEDB_PASSWORD || 'change_me_timescale'
}
```

**Variáveis de Ambiente**:
```bash
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DATABASE=APPS-TPCAPITAL
TIMESCALEDB_SCHEMA=tp-capital
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=changeme
```

### WORKSPACE

**Arquivo**: `backend/api/workspace/src/config.js`

```javascript
export const timescaledbConfig = {
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: Number(process.env.TIMESCALEDB_PORT || 5433),
  database: process.env.WORKSPACE_DATABASE || 'APPS-WORKSPACE',
  user: process.env.TIMESCALEDB_USER || 'timescale',
  password: process.env.TIMESCALEDB_PASSWORD || 'changeme',
  schema: process.env.WORKSPACE_DATABASE_SCHEMA || 'workspace',
  table: process.env.WORKSPACE_TABLE_NAME || 'workspace_items',
};
```

**Variáveis de Ambiente**:
```bash
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
WORKSPACE_DATABASE=APPS-WORKSPACE
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=changeme
WORKSPACE_DATABASE_SCHEMA=workspace
WORKSPACE_TABLE_NAME=workspace_items
```

## Rollback

Se algo der errado, use o script de rollback gerado automaticamente:

```bash
cd backups/database-migration-YYYYMMDD-HHMMSS/
./rollback.sh
```

Este script irá:
1. Remover os novos bancos
2. Restaurar os backups dos bancos antigos
3. Voltar ao estado anterior

## Estrutura dos Bancos

### APPS-TPCAPITAL

#### Schema: tp-capital

**Tabela: tp_capital_signals**
- Armazena sinais de trading capturados do Telegram
- Particionada por dia (TimescaleDB hypertable planejada)
- Índices: ts, asset, source, ingested_at

**Tabela: telegram_bots**
- Configuração dos bots do Telegram
- Status: active, inactive, deleted

**Tabela: telegram_channels**
- Canais monitorados
- Métricas de sinais por canal

### APPS-WORKSPACE

#### Schema: workspace

**Tabela: workspace_items**
- Biblioteca de URLs e recursos
- Índices: category, tags (GIN), created_at

**Tabela: workspace_audit_log**
- Log de auditoria de mudanças
- FK para workspace_items

**Tabela: schema_version**
- Controle de versão do schema

## Monitoramento

### Verificar Tamanho dos Bancos

```sql
SELECT 
    datname as database,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname IN ('APPS-TPCAPITAL', 'APPS-WORKSPACE')
ORDER BY pg_database_size(datname) DESC;
```

### Verificar Schemas

```sql
-- APPS-TPCAPITAL
\c "APPS-TPCAPITAL"
\dn+

-- APPS-WORKSPACE
\c "APPS-WORKSPACE"
\dn+
```

### Verificar Tabelas e Tamanhos

```sql
-- APPS-TPCAPITAL
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'tp-capital'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- APPS-WORKSPACE
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'workspace'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Backup e Restore

### Backup Individual

```bash
# Backup APPS-TPCAPITAL
docker exec data-timescaledb pg_dump -U timescale -d "APPS-TPCAPITAL" \
  -F c -f /tmp/apps-tpcapital-$(date +%Y%m%d).dump

# Backup APPS-WORKSPACE
docker exec data-timescaledb pg_dump -U timescale -d "APPS-WORKSPACE" \
  -F c -f /tmp/apps-workspace-$(date +%Y%m%d).dump
```

### Restore Individual

```bash
# Restore APPS-TPCAPITAL
docker exec data-timescaledb pg_restore -U timescale -d "APPS-TPCAPITAL" \
  /tmp/apps-tpcapital-YYYYMMDD.dump

# Restore APPS-WORKSPACE
docker exec data-timescaledb pg_restore -U timescale -d "APPS-WORKSPACE" \
  /tmp/apps-workspace-YYYYMMDD.dump
```

## Troubleshooting

### Erro: "database does not exist"

Se as aplicações reportarem que o banco não existe:

1. Verifique se a migração foi executada:
```bash
docker exec data-timescaledb psql -U timescale -d postgres -c "\l"
```

2. Verifique as variáveis de ambiente da aplicação
3. Reinicie a aplicação

### Erro: "relation does not exist"

Se as aplicações reportarem que uma tabela não existe:

1. Verifique o schema correto:
```bash
docker exec data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c "\dt tp-capital.*"
```

2. Verifique se o search_path está configurado no código

### Dados Perdidos

Se dados não aparecerem após migração:

1. Verifique os backups em `backups/database-migration-YYYYMMDD-HHMMSS/`
2. Execute o rollback
3. Investigue o log da migração
4. Re-execute a migração se necessário

## Próximos Passos

1. ✅ Migrar todos os ambientes (dev, staging, prod)
2. ✅ Atualizar pipelines de CI/CD
3. ✅ Atualizar scripts de backup automático
4. ✅ Atualizar dashboards de monitoramento
5. ✅ Documentar em runbooks operacionais

## Referências

- [TimescaleDB Documentation](https://docs.timescale.com/)
- [PostgreSQL Schema Management](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [Database Naming Conventions](https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_upper_case_table_or_column_names)

---

**Última atualização**: 2025-10-24  
**Autor**: TradingSystem Team  
**Revisores**: Pending

