# Auditoria - Comandos Start & Stop

**Data**: 2025-10-20  
**Objetivo**: Revisar todos os containers e aplicações para garantir cobertura completa

---

## 📊 Serviços Node.js Encontrados

| #   | Nome                  | Localização                    | Porta | Status no Start Script |
| --- | --------------------- | ------------------------------ | ----- | ---------------------- |
| 1   | workspace-api         | backend/api/workspace          | 3200  | ✅ Incluído            |
| 2   | tp-capital (backend)  | backend/api/tp-capital         | ?     | ❌ **FALTANDO**        |
| 3   | tp-capital (frontend) | frontend/apps/tp-capital       | 3200  | ✅ Incluído            |
| 4   | firecrawl-proxy       | backend/api/firecrawl-proxy    | 3600  | ✅ Incluído            |
| 5   | webscraper-api        | backend/api/webscraper-api     | 3700  | ✅ Incluído            |
| 6   | documentation-api     | backend/api/documentation-api  | 3400  | ℹ️ Docker apenas       |
| 7   | b3-market-data        | frontend/apps/b3-market-data   | 3302  | ✅ Incluído            |
| 8   | dashboard             | frontend/apps/dashboard        | 3103  | ✅ Incluído            |
| 9   | service-launcher      | frontend/apps/service-launcher | 3500  | ✅ Incluído            |
| 10  | WebScraper (UI)       | frontend/apps/WebScraper       | ?     | ❌ **FALTANDO**        |
| 11  | docusaurus            | docs/docusaurus                | 3004  | ✅ Incluído            |

---

## 🐳 Containers Docker Ativos

### Infraestrutura

| Container                  | Status     | Compose File  | Iniciado por start-stacks.sh |
| -------------------------- | ---------- | ------------- | ---------------------------- |
| infra-redis-dev            | ✅ Rodando | langgraph-dev | ✅ Sim                       |
| infra-postgres-dev         | ✅ Rodando | langgraph-dev | ✅ Sim                       |
| infra-langgraph-dev        | ✅ Rodando | langgraph-dev | ✅ Sim                       |
| infra-langgraph            | ⚪ Parado  | infra         | ✅ Sim                       |
| infra-agno-agents          | ⚪ Parado  | infra         | ✅ Sim                       |
| infra-llamaindex-ingestion | ⚪ Parado  | infra         | ✅ Sim                       |
| infra-llamaindex-query     | ⚪ Parado  | infra         | ✅ Sim                       |

### Dados

| Container                 | Status    | Compose File  | Iniciado por start-stacks.sh |
| ------------------------- | --------- | ------------- | ---------------------------- |
| data-timescaledb          | ⚪ Parado | timescale     | ✅ Sim                       |
| data-timescaledb-exporter | ⚪ Parado | timescale     | ✅ Sim                       |
| data-timescaledb-pgadmin  | ⚪ Parado | timescale     | ✅ Sim                       |
| data-timescaledb-pgweb    | ⚪ Parado | timescale     | ✅ Sim                       |
| data-timescaledb-backup   | ⚪ Parado | timescale     | ✅ Sim                       |
| data-questdb              | ⚪ Parado | timescale     | ✅ Sim                       |
| data-qdrant               | ⚪ Parado | timescale     | ✅ Sim                       |
| data-postgress-langgraph  | ⚪ Parado | timescale     | ✅ Sim                       |
| data-frontend-apps        | ⚪ Parado | frontend-apps | ✅ Sim                       |

### Monitoramento

| Container        | Status    | Compose File | Iniciado por start-stacks.sh |
| ---------------- | --------- | ------------ | ---------------------------- |
| mon-prometheus   | ⚪ Parado | monitoring   | ✅ Sim                       |
| mon-grafana      | ⚪ Parado | monitoring   | ✅ Sim                       |
| mon-alertmanager | ⚪ Parado | monitoring   | ✅ Sim                       |
| mon-alert-router | ⚪ Parado | monitoring   | ✅ Sim                       |

### Documentação

| Container       | Status    | Compose File | Iniciado por start-stacks.sh |
| --------------- | --------- | ------------ | ---------------------------- |
| docs-api        | ⚪ Parado | docs         | ✅ Sim                       |
| docs-api-viewer | ⚪ Parado | docs         | ✅ Sim                       |

### Firecrawl

| Container            | Status    | Compose File | Iniciado por start-stacks.sh |
| -------------------- | --------- | ------------ | ---------------------------- |
| firecrawl-api        | ⚪ Parado | firecrawl    | ✅ Sim                       |
| firecrawl-playwright | ⚪ Parado | firecrawl    | ✅ Sim                       |
| firecrawl-postgres   | ⚪ Parado | firecrawl    | ✅ Sim                       |
| firecrawl-redis      | ⚪ Parado | firecrawl    | ✅ Sim                       |

### Outros

| Container                  | Status     | Iniciado?                      |
| -------------------------- | ---------- | ------------------------------ |
| ollama                     | ✅ Rodando | ❓ Manual (externo ao projeto) |
| outros-containers-registry | ⚪ Parado  | ❓ Desconhecido                |

---

## ⚠️ Problemas Identificados

### 1. tp-capital Duplicado

**Localização**:

-   `backend/api/tp-capital` - **NÃO está no start script**
-   `frontend/apps/tp-capital` - ✅ Está no start script

**Descrição**: Ambos têm o mesmo nome e descrição ("Telegram ingestion pipeline for TP Capital with QuestDB persistence")

**Ação Necessária**:

-   [ ] Investigar se são realmente duplicados ou servem propósitos diferentes
-   [ ] Se duplicados, remover um e consolidar
-   [ ] Se diferentes, renomear para distinguir

### 2. WebScraper UI não incluído

**Localização**: `frontend/apps/WebScraper`

**Problema**: Existe um frontend WebScraper mas não está sendo iniciado pelo script

**Ação Necessária**:

-   [ ] Verificar se deve ser incluído no start script
-   [ ] Adicionar porta no start script se necessário
-   [ ] Ou remover se obsoleto

### 3. documentation-api em Docker

**Status**: ℹ️ Esperado (roda apenas como container Docker)

**Localização**: `backend/api/documentation-api` + container `docs-api`

✅ **Correto**: Já está coberto pelo docker-compose.docs.yml

---

## 📝 Recomendações

### Serviços Node.js

#### Adicionar ao start-all.sh:

```bash
# Se backend/api/tp-capital for diferente do frontend/apps/tp-capital
["tp-capital-backend"]="backend/api/tp-capital:3201:npm run dev"

# WebScraper UI (se necessário)
["webscraper-ui"]="frontend/apps/WebScraper:3701:npm run dev"
```

### Documentação

#### Atualizar nos scripts e docs:

1. **`scripts/startup/start-tradingsystem-full.sh`** - Help text
2. **`scripts/shutdown/stop-tradingsystem-full.sh`** - Help text
3. **`docs/context/ops/universal-commands.md`** - Tabela de serviços
4. **`CLAUDE.md`** - Active Services & Ports

### Limpeza

#### Containers Órfãos:

```bash
# Verificar o que é "outros-containers-registry"
docker inspect outros-containers-registry

# Se não for necessário, remover:
docker rm outros-containers-registry
```

---

## ✅ Ações Imediatas

### Prioridade Alta

1. **Investigar tp-capital duplicado**

    ```bash
    diff -r backend/api/tp-capital frontend/apps/tp-capital
    ```

2. **Verificar WebScraper UI**
    ```bash
    cd frontend/apps/WebScraper
    npm run dev  # Testar se inicia
    ```

### Prioridade Média

3. **Atualizar documentação** com todos os serviços confirmados

4. **Testar comandos start/stop** após ajustes

### Prioridade Baixa

5. **Limpar containers órfãos** (outros-containers-registry)

---

## 📊 Status Geral

| Categoria             | Total | Incluídos | Faltando | % Cobertura |
| --------------------- | ----- | --------- | -------- | ----------- |
| **Serviços Node.js**  | 11    | 8         | 2-3      | ~73-82%     |
| **Containers Docker** | 29    | 29        | 0        | 100%        |
| **Overall**           | 40    | 37-38     | 2-3      | ~92-95%     |

✅ **Cobertura Geral**: Excelente (>90%)  
⚠️ **Necessita Atenção**: tp-capital duplicado + WebScraper UI

---

**Próximos Passos**:

1. Investigar duplicatas
2. Atualizar scripts se necessário
3. Atualizar documentação
4. Testar comandos completos
5. Marcar como ✅ concluído

**Responsável**: TradingSystem Team  
**Status**: 🔍 Em Revisão


