# Database Structure Standard

## Overview
Este documento estabelece o padrão de estrutura de banco de dados para o TradingSystem.

## Convenção de Nomenclatura

### Hierarquia
```
DATABASE: APPS-{APLICACAO}
  └─ SCHEMA: {aplicacao}
      └─ TABLES: {nome_da_tabela}
```

### Regras

1. **Database Names**
   - Formato: `APPS-{APLICACAO}` (uppercase)
   - Exemplo: `APPS-WORKSPACE`, `APPS-TPCAPITAL`
   - Usar hífen (-) para separar palavras

2. **Schema Names**
   - Formato: `{aplicacao}` (lowercase)
   - Usar underscore (_) para separar palavras
   - Nunca usar hífen (-) em schemas (incompatível com SQL)
   - Exemplo: `workspace`, `tp_capital`, `b3_market`

3. **Table Names**
   - Formato: `{nome_descritivo}` (lowercase)
   - Usar underscore (_) para separar palavras
   - Prefixar com nome do schema quando relevante
   - Exemplo: `workspace_items`, `tp_capital_signals`, `telegram_bots`

4. **Schema `public`**
   - ❌ **NUNCA usar `public` para tabelas de aplicação**
   - Reservado apenas para extensões do PostgreSQL/TimescaleDB
   - Deve permanecer vazio em bancos de aplicação

## Estrutura Atual

### APPS-WORKSPACE
```
APPS-WORKSPACE/
└── workspace/
    ├── workspace_items         -- Itens do banco de ideias
    ├── workspace_audit_log     -- Log de auditoria
    └── schema_version          -- Controle de versão
```

### APPS-TPCAPITAL
```
APPS-TPCAPITAL/
└── tp_capital/
    ├── tp_capital_signals      -- Sinais processados
    ├── telegram_bots           -- Configuração de bots
    └── telegram_channels       -- Canais monitorados
```

## Vantagens do Padrão

1. **Organização Clara**
   - Fácil identificar a que aplicação cada tabela pertence
   - Estrutura hierárquica lógica

2. **Isolamento**
   - Evita conflitos de nomes entre aplicações
   - Cada app tem seu namespace isolado

3. **Segurança**
   - Permissões granulares por schema
   - Possibilidade de diferentes usuários por app

4. **Manutenção**
   - Backup/restore de schemas específicos
   - Migrações isoladas por aplicação
   - Fácil identificação de dependências

5. **Escalabilidade**
   - Padrão consistente facilita adicionar novas apps
   - Estrutura previsível para ferramentas e automações

## Acessando via Adminer

### TP Capital
- **Base de dados**: `APPS-TPCAPITAL`
- **Esquema**: `tp_capital`
- **Usuário**: `timescale`
- **Senha**: `changeme`

### Workspace
- **Base de dados**: `APPS-WORKSPACE`
- **Esquema**: `workspace`
- **Usuário**: `timescale`
- **Senha**: `changeme`

## Criando Nova Aplicação

Ao criar uma nova aplicação, siga estes passos:

```sql
-- 1. Criar database
CREATE DATABASE "APPS-NOVAAPP" OWNER timescale;

-- 2. Conectar ao database
\c APPS-NOVAAPP

-- 3. Criar schema dedicado
CREATE SCHEMA novaapp AUTHORIZATION timescale;

-- 4. Criar tabelas no schema dedicado
CREATE TABLE novaapp.exemplo (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL
);

-- 5. Definir search_path padrão (opcional)
ALTER DATABASE "APPS-NOVAAPP" SET search_path TO novaapp, public;
```

## Migrações

Ao fazer migrações, sempre especificar o schema:

```sql
-- ❌ ERRADO (cria no public)
CREATE TABLE nova_tabela (...);

-- ✅ CORRETO (cria no schema dedicado)
CREATE TABLE workspace.nova_tabela (...);
```

## Checklist de Padronização

- [ ] Database usa formato `APPS-{NOME}`
- [ ] Schema dedicado existe e é usado
- [ ] Schema usa underscore, não hífen
- [ ] Tabelas estão no schema dedicado, não no `public`
- [ ] Migrations especificam o schema
- [ ] Documentação atualizada

## Troubleshooting

### Erro 42P01 (table not found) após migração de schema

**Problema:** Após renomear schema ou alterar search_path, aplicações retornam erro 42P01.

**Causa:** Conexões antigas ainda usam o search_path antigo.

**Solução:**

```bash
# 1. Terminar todas as conexões do banco
docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE datname = 'APPS-TPCAPITAL' AND pid <> pg_backend_pid();"

# 2. Reiniciar aplicações que conectam ao banco
pkill -9 -f "node.*tp-capital"
docker restart <container-name>  # se usar Docker

# 3. Verificar novo search_path
docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL -c "SHOW search_path;"

# 4. Testar query
docker exec data-timescaledb psql -U timescale -d APPS-TPCAPITAL -c \
  "SELECT * FROM tp_capital_signals LIMIT 1;"
```

### Verificar Conexões Ativas

```sql
-- Ver todas as conexões e suas queries
SELECT pid, state, query, backend_start 
FROM pg_stat_activity 
WHERE datname = 'APPS-TPCAPITAL';

-- Matar conexão específica
SELECT pg_terminate_backend(PID);
```

## Histórico

- **2025-10-24**: Padrão estabelecido e documentado
- **2025-10-24**: APPS-TPCAPITAL migrado de `public` para `tp_capital`
- **2025-10-24**: Schema `tp-capital` renomeado para `tp_capital`
- **2025-10-24**: Configurado search_path padrão para ambos os bancos
- **2025-10-24**: Adicionado troubleshooting para erros 42P01

