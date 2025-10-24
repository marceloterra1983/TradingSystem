# Scripts de Banco de Dados

Scripts para gerenciamento e migração de bancos de dados do TradingSystem.

## 📋 Scripts Disponíveis

### `migrate-database-structure.sh`

Migra a estrutura de banco de dados para a nova organização:

**Estrutura Anterior → Nova:**
```
tradingsystem (public schema) → APPS-TPCAPITAL (tp-capital schema)
frontend_apps (workspace schema) → APPS-WORKSPACE (workspace schema)
```

#### Uso

```bash
cd /home/marce/Projetos/TradingSystem
./scripts/database/migrate-database-structure.sh
```

#### O que o script faz

1. ✅ Verifica bancos de origem
2. ✅ Cria backups automáticos
3. ✅ Cria novos bancos de dados
4. ✅ Migra todos os dados
5. ✅ Cria índices e triggers
6. ✅ Valida integridade
7. ✅ Gera script de rollback

#### Saída

- **Backups**: `backups/database-migration-YYYYMMDD-HHMMSS/`
- **Log**: `backups/database-migration-YYYYMMDD-HHMMSS/migration.log`
- **Rollback**: `backups/database-migration-YYYYMMDD-HHMMSS/rollback.sh`

### `migrate-database-structure.sql`

Script SQL usado pela migração. Pode ser executado manualmente se necessário:

```bash
docker cp migrate-database-structure.sql data-timescaledb:/tmp/
docker exec data-timescaledb psql -U timescale -d postgres -f /tmp/migrate-database-structure.sql
```

### `backup-timescaledb.sh`

Cria backups dos bancos TimescaleDB.

#### Uso

```bash
./scripts/database/backup-timescaledb.sh
```

## 🔄 Fluxo de Migração Completo

### 1. Preparação

```bash
# Parar aplicações
# TP-CAPITAL: Ctrl+C no terminal
# WORKSPACE: Ctrl+C no terminal

# Verificar status dos containers
docker ps | grep timescaledb
```

### 2. Executar Migração

```bash
cd /home/marce/Projetos/TradingSystem
./scripts/database/migrate-database-structure.sh
```

### 3. Verificar Migração

```bash
# Verificar novos bancos
docker exec data-timescaledb psql -U timescale -d postgres -c "\l" | grep APPS

# Verificar dados no APPS-TPCAPITAL
docker exec data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c \
  "SELECT COUNT(*) FROM \"tp-capital\".tp_capital_signals;"

# Verificar dados no APPS-WORKSPACE
docker exec data-timescaledb psql -U timescale -d "APPS-WORKSPACE" -c \
  "SELECT COUNT(*) FROM workspace.workspace_items;"
```

### 4. Iniciar Aplicações

```bash
# TP-CAPITAL
cd apps/tp-capital
npm run dev

# WORKSPACE (em outro terminal)
cd backend/api/workspace
npm run dev
```

### 5. Testar Aplicações

```bash
# TP-CAPITAL
curl http://localhost:4005/health
curl http://localhost:4005/signals

# WORKSPACE
curl http://localhost:3200/health
curl http://localhost:3200/api/library
```

### 6. Limpar Bancos Antigos (Opcional)

⚠️ **Apenas após validar que tudo funciona!**

```bash
docker exec data-timescaledb psql -U timescale -d postgres -c \
  "DROP DATABASE tradingsystem; DROP DATABASE frontend_apps;"
```

## 🔙 Rollback

Se algo der errado, execute o rollback:

```bash
cd backups/database-migration-YYYYMMDD-HHMMSS/
./rollback.sh
```

## 📊 Estrutura dos Bancos

### APPS-TPCAPITAL

```
Database: APPS-TPCAPITAL
└── Schema: tp-capital
    ├── tp_capital_signals (sinais de trading)
    ├── telegram_bots (configuração de bots)
    └── telegram_channels (canais monitorados)
```

**Aplicação**: TP-CAPITAL (porta 4005)  
**Configuração**: `apps/tp-capital/src/config.js`

### APPS-WORKSPACE

```
Database: APPS-WORKSPACE
└── Schema: workspace
    ├── workspace_items (biblioteca de URLs)
    ├── workspace_audit_log (auditoria)
    └── schema_version (controle de versão)
```

**Aplicação**: WORKSPACE (porta 3200)  
**Configuração**: `backend/api/workspace/src/config.js`

## 🛠️ Comandos Úteis

### Conectar aos Bancos

```bash
# APPS-TPCAPITAL
docker exec -it data-timescaledb psql -U timescale -d "APPS-TPCAPITAL"

# APPS-WORKSPACE
docker exec -it data-timescaledb psql -U timescale -d "APPS-WORKSPACE"
```

### Listar Schemas

```bash
# APPS-TPCAPITAL
docker exec data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c "\dn"

# APPS-WORKSPACE
docker exec data-timescaledb psql -U timescale -d "APPS-WORKSPACE" -c "\dn"
```

### Listar Tabelas

```bash
# APPS-TPCAPITAL
docker exec data-timescaledb psql -U timescale -d "APPS-TPCAPITAL" -c "\dt tp-capital.*"

# APPS-WORKSPACE
docker exec data-timescaledb psql -U timescale -d "APPS-WORKSPACE" -c "\dt workspace.*"
```

### Ver Tamanho dos Bancos

```bash
docker exec data-timescaledb psql -U timescale -d postgres -c \
  "SELECT datname, pg_size_pretty(pg_database_size(datname)) 
   FROM pg_database 
   WHERE datname LIKE 'APPS-%' 
   ORDER BY pg_database_size(datname) DESC;"
```

## ❗ Troubleshooting

### Erro: Permission Denied

```bash
chmod +x scripts/database/migrate-database-structure.sh
```

### Erro: Container não encontrado

```bash
docker ps -a | grep timescaledb
docker start data-timescaledb
```

### Erro: Banco já existe

O script perguntará se deseja dropar e recriar. Responda `yes` se tiver certeza.

### Dados não aparecem

1. Verifique se está conectando ao banco correto
2. Verifique o schema nas queries
3. Consulte o log de migração
4. Execute rollback se necessário

## 📚 Documentação Completa

Consulte a documentação detalhada em:
`docs/context/backend/data/DATABASE-STRUCTURE-MIGRATION.md`

## ✅ Checklist Pós-Migração

- [ ] Migração executada com sucesso
- [ ] Dados verificados nos novos bancos
- [ ] TP-CAPITAL iniciado e testado
- [ ] WORKSPACE iniciado e testado
- [ ] Backup dos bancos antigos preservado
- [ ] Bancos antigos removidos (após validação)
- [ ] Documentação atualizada
- [ ] Equipe notificada

## 🚀 Próximos Passos

1. Atualizar `.env` com novas configurações se necessário
2. Atualizar scripts de CI/CD
3. Atualizar monitoramento
4. Documentar em runbooks operacionais
5. Migrar outros ambientes (staging, prod)

---

**Última atualização**: 2025-10-24  
**Autor**: TradingSystem Team

