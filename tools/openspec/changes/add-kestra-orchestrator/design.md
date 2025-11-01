## Design — add-kestra-orchestrator

> Elaborado com base nas orientações de `.claude/agents/docker-health-optimizer.md` (governança e saúde Docker) e `.claude/agents/fullstack-developer.md` (integração end-to-end).

### 1. Contexto
- Objetivo: disponibilizar o Kestra (`kestra/kestra:latest`) como orquestrador de jobs on-premise executando em modo `server standalone`, com persistência garantida por Postgres dedicado.
- Stack alvo: **Tools**, onde já residem serviços auxiliares (LangGraph, Agno Agents). Compose é a forma padrão de operação; wrappers `tools/kestra/scripts/*.sh` fornecem fallback manual.
- Constraints: execução com privilégios (`--user=root`), montagem do socket Docker e manutenção de volumes de dados (`tools/kestra/storage`, `tools/kestra/workdir`).

### 2. Arquitetura Operacional
```
operators ── docker compose -f tools/compose/docker-compose.tools.yml up -d kestra
            ├─ service tools-kestra           (command: server standalone)
            │    ├─ image: kestra/kestra:latest
            │    ├─ ports: ${KESTRA_HTTP_PORT:-8080}:8080, ${KESTRA_MANAGEMENT_PORT:-8081}:8081
            │    ├─ depends_on: tools-kestra-postgres (healthcheck)
            │    └─ volumes: /var/run/docker.sock, ${KESTRA_WORKDIR_DIR:-../kestra/workdir}, ${KESTRA_STORAGE_DIR:-../kestra/storage}
            └─ service tools-kestra-postgres (Postgres 15, volume nomeado `kestra-postgres-data`)

          ── tools/kestra/scripts/run.sh (modo manual/fallback)
                 ├─ docker run --pull=always --rm ... server standalone
                 ├─ injeta `KESTRA_CONFIGURATION` com dados do Postgres/Básic Auth
                 └─ garante criação dos diretórios `storage`/`workdir`
```
- `run.sh` respalda literalmente o comando oficial, expondo porta HTTP, porta de management, diretório temporário e parâmetros extras via variáveis.
- `run.sh` aceita `--detach`, `--port`, `--management-port` para execução flexível (uso pontual); `status.sh`, `logs.sh`, `stop.sh` interagem com o contêiner atual.
- `start-stacks.sh --phase tools` e `stop-stacks.sh` orquestram o Compose, mantendo UX consistente com demais stacks (variável `SKIP_Kestra_AUTO_START` disponível).

### 3. Considerações Docker (alinhamento com docker-health-optimizer)
- **Pull constante**: `--pull=always` garante atualização para `latest`. Documentar que ambientes críticos podem fixar versão em evoluções futuras.
- **Privilégios**: `--user=root` + `/var/run/docker.sock` exigem controles de acesso (grupo docker restrito, scripts sob ACL adequada). Registrar alertas visíveis na documentação.
- **Recursos**: Monitorar com `docker stats`; caso necessário, documentar limites (`--cpus`, `--memory`).
- **Logs**: acessados via `docker logs`; wrapper `logs.sh` facilita acompanhamento. Para rotações avançadas, planejar integração futura com stack de observabilidade.
- **Networking**: Porta HTTP padrão 8080 (ajustável via `KESTRA_HTTP_PORT`) e management 8081 (`KESTRA_MANAGEMENT_PORT`), ambas expostas apenas localmente.
- **Naming**: Contêiner nomeado `tools-kestra` (sobrescrevível via `KESTRA_CONTAINER_NAME`) e banco `tools-kestra-postgres`.
- **Persistência**: Postgres dedicado com volume nomeado + bind mounts em `tools/kestra/storage` (dados) e `tools/kestra/workdir` (tmp). Incluir diretórios em políticas de backup.
- **Health checks**: scripts dedicados (`status.sh`) e integração com `scripts/maintenance/health-check-all.sh` executam `docker ps`, `docker inspect` e `curl` para garantir estado saudável, seguindo checklist do agente docker-health-optimizer.

### 4. Integração Full-Stack
- **Service Launcher** (`apps/status`):
  - Exibir `kestra-orchestrator` com health check em `http://localhost:${KESTRA_MANAGEMENT_PORT}/health` (fallback `docker ps`).
  - Expor link direto para a UI.
- **Manifesto de serviços**:
  - `config/services-manifest.json` recebe entrada `managed: "docker-compose"`, `stack: "tools"`, apontando para o comando `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra` e scripts auxiliares de status.
- **Scripts Docker**:
  - `start-stacks.sh` sobe a stack Tools (Kestra incluso). Com `SKIP_Kestra_AUTO_START=1`, inicia apenas LangGraph/Agno. Se detectar conflito de porta, inicia os demais serviços e orienta ajustar `.env`.
  - `stop-stacks.sh` chama `tools/kestra/scripts/stop.sh` após derrubar a stack.
- **Documentação**:
  - Criar `docs/context/ops/orchestration/kestra.md` descritivo (pré-requisitos, execução, troubleshooting, segurança).
  - Atualizar `service-port-map`, runbooks e checklists operacionais.

### 5. Fluxo Operacional
1. Operador atualiza `.env` com portas, credenciais do Postgres (`KESTRA_DB_*`) e Basic Auth (`KESTRA_BASICAUTH_*`).
2. Executa `./scripts/docker/start-stacks.sh --phase tools` (Kestra sobe automaticamente via Compose; use `SKIP_Kestra_AUTO_START=1` para pular ou `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra` para start isolado).
3. Verifica status via `tools/kestra/scripts/status.sh` ou Service Launcher.
4. Acessa UI web em `http://localhost:${KESTRA_HTTP_PORT}` para gerenciar flows.
5. Usa `tools/kestra/scripts/logs.sh` para acompanhar execuções e `stop.sh` para encerrar.
6. Documentação orienta backups dos diretórios `storage`/`workdir` e a rotação das credenciais.

### 6. Riscos & Mitigações
- **Escalada de privilégios**: só operadores confiáveis rodam os scripts; reforçar políticas de sudo/grupo docker.
- **Configuração sensível**: credenciais de Postgres e Basic Auth residem no `.env`; reforçar governança de segredos.
- **Consumo de recursos**: monitoramento manual (docker stats) e limites opcionais; sugerir revisão após piloto.
- **Dependência do Docker socket**: reforçar isolamento do host, manter engine atualizada e auditar uso.

### 7. Validação
- Testar wrappers (`run`, `status`, `logs`, `stop`) localmente.
- Confirmar integração com scripts `start-stacks.sh`/`stop-stacks.sh`.
- Validar Service Launcher retornando status correto.
- Rodar `openspec validate add-kestra-orchestrator --strict` antes de submeter para aprovação.

### 8. Futuro (roadmap)
- Integrar autenticação corporativa (reverse proxy / SSO) quando houver exposição externa.
- Automatizar coleta de métricas (`/metrics`) e dashboards específicos.
- Avaliar migração do storage local para backend S3/MinIO conforme crescimento de cargas.

> Este design mantém Kestra alinhado ao comando oficial, respeitando governança Docker do projeto e fornecendo experiência consistente aos operadores do stack Tools.
