# TradingSystem Docker Infrastructure

## Visão Geral

A infraestrutura Docker do TradingSystem está organizada em grupos funcionais para facilitar o gerenciamento e a manutenção. Cada grupo contém serviços relacionados e pode ser gerenciado independentemente.

## Estrutura de Diretórios

```
TradingSystem/
├── config/
│   ├── container-images.env      # Configuração das imagens Docker
│   └── docker.env               # Variáveis de ambiente centralizadas
├── infrastructure/
│   └── compose/
│       ├── docker-compose.database.yml      # Grupo Database
│       ├── docker-compose.documentation.yml # Grupo Documentation
│       ├── docker-compose.firecrawl.yml     # Grupo Firecrawl
│       ├── docker-compose.infrastructure.yml# Grupo Infrastructure
│       ├── docker-compose.monitoring.yml    # Grupo Monitoring
│       ├── docker-compose.individual.yml    # Grupo Individual
│       └── docker-compose.timescale.yml     # Arquivo original (legacy)
├── scripts/
│   └── docker/
│       ├── docker-manager.sh    # Script de gerenciamento
│       └── start-stacks.sh      # Script original de inicialização
└── docs/
    └── docker/
        └── README.md            # Esta documentação
```

## Grupos de Containers

### 🗄️ Database (10 containers)
**Arquivo:** `docker-compose.database.yml`

- **data-timescaledb** - TimescaleDB principal (Porta: 5433)
- **data-timescaledb-backup** - Backup do TimescaleDB (Porta: 5434)
- **data-timescaledb-exporter** - Exportador de métricas (Porta: 9187)
- **data-timescaledb-pgadmin** - Interface de administração (Porta: 5050)
- **data-timescaledb-pgweb** - Interface web para PostgreSQL (Porta: 8081)
- **data-timescaledb-adminer** - Adminer para gerenciamento (Porta: 8080)
- **data-postgress-langgraph** - PostgreSQL para LangGraph (Porta: 5435)
- **data-qdrant** - Banco vetorial Qdrant (Portas: 6333, 6334)
- **data-questdb** - Banco de dados QuestDB (Portas: 9000, 9009, 8812)
- **data-frontend-apps** - Aplicações frontend (Porta: 3001)

### 📚 Documentation (2 containers)
**Arquivo:** `docker-compose.documentation.yml`

- **docs-api** - API de documentação (Porta: 3400)
- **docs-api-viewer** - Visualizador da documentação (Porta: 3101)

### 🕷️ Firecrawl (4 containers)
**Arquivo:** `docker-compose.firecrawl.yml`

- **firecrawl-api** - API do Firecrawl (Porta: 3002)
- **firecrawl-postgres** - PostgreSQL do Firecrawl (Porta: 5436)
- **firecrawl-redis** - Redis do Firecrawl (Porta: 6379)
- **firecrawl-playwright** - Playwright do Firecrawl (Porta: 3003)

### 🏗️ Infrastructure (4 containers)
**Arquivo:** `docker-compose.infrastructure.yml`

- **infra-langgraph** - Serviço LangGraph (Porta: 8111)
- **infra-llamaindex-ingestion** - Ingestão LlamaIndex (Porta: 8201)
- **infra-llamaindex-query** - Consulta LlamaIndex (Porta: 8202)
- **infra-agno-agents** - Agentes Agno (Porta: 8200)

### 📊 Monitoring (4 containers)
**Arquivo:** `docker-compose.monitoring.yml`

- **mon-prometheus** - Prometheus (Porta: 9090)
- **mon-alertmanager** - AlertManager (Porta: 9093)
- **mon-grafana** - Grafana (Porta: 3000)
- **mon-alert-router** - Roteador de alertas (Porta: 9094)

### 🔧 Individual (2 containers)
**Arquivo:** `docker-compose.individual.yml`

- **ollama** - Ollama (Porta: 11434)
- **individual-containers-registry** - Registry Docker (Porta: 5000)

## Gerenciamento

### Script de Gerenciamento

Use o script `docker-manager.sh` para gerenciar os containers:

```bash
# Iniciar todos os grupos
./scripts/docker/docker-manager.sh start all

# Iniciar apenas o grupo database
./scripts/docker/docker-manager.sh start database

# Parar o grupo monitoring
./scripts/docker/docker-manager.sh stop monitoring

# Ver status de todos os containers
./scripts/docker/docker-manager.sh status all

# Ver logs do grupo firecrawl
./scripts/docker/docker-manager.sh logs firecrawl

# Limpar containers parados
./scripts/docker/docker-manager.sh clean all
```

### Comandos Docker Compose Diretos

```bash
# Iniciar grupo específico
cd infrastructure/compose
docker compose -f docker-compose.database.yml up -d

# Parar grupo específico
docker compose -f docker-compose.database.yml down

# Ver logs
docker compose -f docker-compose.database.yml logs -f

# Ver status
docker compose -f docker-compose.database.yml ps
```

## Configuração

### Variáveis de Ambiente

Todas as variáveis de ambiente estão centralizadas em `config/docker.env`:

- **IMG_VERSION** - Versão das imagens Docker
- **TIMESCALEDB_*** - Configurações do TimescaleDB
- **POSTGRES_*** - Configurações do PostgreSQL
- **PGADMIN_*** - Configurações do pgAdmin
- **DOCS_*** - Configurações de documentação
- **FIRECRAWL_*** - Configurações do Firecrawl
- **INFRA_*** - Configurações de infraestrutura
- **MON_*** - Configurações de monitoramento

### Imagens Docker

As imagens são configuradas em `config/container-images.env`:

- **Database**: TimescaleDB, PostgreSQL, Qdrant, QuestDB
- **Documentation**: Nginx (placeholder)
- **Firecrawl**: Nginx, PostgreSQL, Redis
- **Infrastructure**: Nginx (placeholder)
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Individual**: Ollama, Registry

## Redes Docker

Cada grupo cria sua própria rede Docker:

- **database_default** - Rede do grupo database
- **documentation_default** - Rede do grupo documentation
- **firecrawl_default** - Rede do grupo firecrawl
- **infrastructure_default** - Rede do grupo infrastructure
- **monitoring_default** - Rede do grupo monitoring
- **individual_default** - Rede do grupo individual

## Volumes Docker

Os volumes são criados automaticamente conforme necessário:

- **timescaledb-data** - Dados do TimescaleDB
- **timescaledb-backups** - Backups do TimescaleDB
- **timescaledb-pgadmin** - Dados do pgAdmin
- **timescaledb-pgweb** - Dados do pgWeb
- **langgraph-postgres** - Dados do PostgreSQL LangGraph
- **qdrant_data** - Dados do Qdrant
- **questdb_data** - Dados do QuestDB

## Troubleshooting

### Problemas Comuns

1. **Containers não aparecem na extensão Docker do Cursor**
   - Verifique se os containers estão rodando: `docker ps`
   - Reinicie a extensão Docker do Cursor
   - Verifique se as redes estão criadas: `docker network ls`

2. **Conflitos de porta**
   - Verifique se as portas estão disponíveis: `netstat -tulpn | grep :PORT`
   - Altere as portas no arquivo `config/docker.env`

3. **Imagens não encontradas**
   - Verifique se as imagens estão definidas em `config/container-images.env`
   - Execute `docker pull IMAGE_NAME` para baixar as imagens

4. **Variáveis de ambiente não carregadas**
   - Verifique se o arquivo `config/docker.env` existe
   - Verifique se o caminho está correto nos arquivos compose

### Logs e Debugging

```bash
# Ver logs de um container específico
docker logs CONTAINER_NAME

# Ver logs de um grupo
docker compose -f docker-compose.GROUP.yml logs

# Ver logs em tempo real
docker compose -f docker-compose.GROUP.yml logs -f

# Inspecionar container
docker inspect CONTAINER_NAME

# Ver uso de recursos
docker stats
```

## Desenvolvimento

### Adicionando Novos Serviços

1. Adicione a imagem em `config/container-images.env`
2. Adicione as variáveis de ambiente em `config/docker.env`
3. Adicione o serviço no arquivo compose apropriado
4. Atualize esta documentação

### Modificando Configurações

1. Edite `config/docker.env` para variáveis de ambiente
2. Edite `config/container-images.env` para imagens
3. Reinicie os containers afetados

## Backup e Restore

### Backup de Volumes

```bash
# Backup do TimescaleDB
docker run --rm -v timescaledb-data:/data -v $(pwd):/backup alpine tar czf /backup/timescaledb-backup.tar.gz /data

# Backup do Qdrant
docker run --rm -v qdrant_data:/data -v $(pwd):/backup alpine tar czf /backup/qdrant-backup.tar.gz /data
```

### Restore de Volumes

```bash
# Restore do TimescaleDB
docker run --rm -v timescaledb-data:/data -v $(pwd):/backup alpine tar xzf /backup/timescaledb-backup.tar.gz -C /

# Restore do Qdrant
docker run --rm -v qdrant_data:/data -v $(pwd):/backup alpine tar xzf /backup/qdrant-backup.tar.gz -C /
```

## Segurança

### Boas Práticas

1. **Senhas**: Use senhas fortes em produção
2. **Redes**: Os containers estão isolados por grupos
3. **Volumes**: Dados sensíveis são armazenados em volumes nomeados
4. **Imagens**: Use imagens oficiais e mantenha atualizadas

### Configurações de Produção

Para produção, considere:

1. Usar secrets do Docker para senhas
2. Configurar TLS/SSL
3. Usar imagens específicas (não `latest`)
4. Configurar backup automático
5. Monitorar logs e métricas

---

**Última atualização:** 2025-10-23  
**Versão:** 1.0.0



