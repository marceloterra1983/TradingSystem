# Kestra Orchestrator (Tools Stack)

> Kestra integra a stack **Tools** via `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra`. Os wrappers em `tools/kestra/scripts/*.sh` encapsulam o comando oficial `docker run` para operações pontuais ou fallback.

## Pré-requisitos

- Docker ≥ 24 com acesso ao socket `/var/run/docker.sock`.
- Arquivo `.env` na raiz do repositório contendo:
  - `KESTRA_HTTP_PORT` / `KESTRA_MANAGEMENT_PORT` – portas expostas (padrões `8080` / `8081`).
  - `KESTRA_DB_HOST`, `KESTRA_DB_PORT`, `KESTRA_DB_NAME`, `KESTRA_DB_USER`, `KESTRA_DB_PASSWORD` – credenciais do Postgres dedicado.
  - `KESTRA_BASICAUTH_USERNAME`, `KESTRA_BASICAUTH_PASSWORD` – credenciais de login da UI.
  - `KESTRA_DOCKER_NETWORK` e `KESTRA_CONTAINER_NAME` (customização opcional).
- Diretórios locais `tools/kestra/storage` e `tools/kestra/workdir` com permissão de leitura/escrita (criados automaticamente).
- Usuário no grupo `docker` (ou root) para executar `docker run`.

## Comandos principais

| Script | Descrição |
|--------|-----------|
| `tools/kestra/scripts/run.sh` | Executa `docker run --pull=always --rm` já com Postgres dedicado, storage persistente e autenticação básica (suporta `--detach`, `--port`, `--management-port`). |
| `tools/kestra/scripts/status.sh` | Lista containers ativos derivados de `kestra/kestra:latest`. |
| `tools/kestra/scripts/logs.sh` | Segue logs (`docker logs -f`) do contêiner ativo. |
| `tools/kestra/scripts/stop.sh` | Finaliza contêiner Kestra em execução. |
| `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra` | Inicia o serviço integrado na stack Tools (equivalente ao uso do wrapper em modo detached). |

## Integrações de stack

- `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra`: inicia apenas o orquestrador como parte da stack Tools.
- `./scripts/docker/start-stacks.sh --phase tools`: sobe Kestra por padrão; defina `SKIP_Kestra_AUTO_START=1` para iniciar os demais serviços da stack sem o orquestrador.
- Se as portas configuradas (`KESTRA_HTTP_PORT`, `KESTRA_MANAGEMENT_PORT`) estiverem ocupadas, o script detecta o conflito, pula o container e orienta ajustar as variáveis ou liberar as portas antes de tentar novamente.
- `./scripts/docker/stop-stacks.sh`: rotina padrão já executa `tools/kestra/scripts/stop.sh` ao final.
- Contêiner padrão: `tools-kestra` na rede `tradingsystem_backend` (ajustável via `.env`).
- `config/services-manifest.json`: entrada `kestra-orchestrator` marcada como `managed: "docker-compose"`.

## Segurança

- Os serviços `tools-kestra` e `tools-kestra-postgres` rodam como `root` e montam `/var/run/docker.sock`; limite o uso aos operadores autorizados.
- Proteja as portas expostas (`KESTRA_HTTP_PORT`, `KESTRA_MANAGEMENT_PORT`) via VPN/firewall ou reverse proxy se acessadas fora do host local.
- Armazene as credenciais (`KESTRA_DB_PASSWORD`, `KESTRA_BASICAUTH_PASSWORD`) no `.env` e rotacione periodicamente.
- O diretório `tools/kestra/storage/` contém definições, execuções e anexos do Kestra – inclua em backups ou políticas de retenção conforme necessidade.

## Monitoramento manual

- `tools/kestra/scripts/status.sh` confirma se o contêiner está ativo.
- `docker stats --no-stream $(docker ps --filter "ancestor=kestra/kestra:latest" -q)` monitora uso de recursos.
- `docker inspect $(docker ps --filter "ancestor=kestra/kestra:latest" -q | head -n1)` revisa mounts, portas e limites.
- `curl -fsS http://localhost:${KESTRA_MANAGEMENT_PORT:-8081}/health` valida o endpoint de management (fallback `http://localhost:${KESTRA_HTTP_PORT:-8080}/actuator/health`).
- Avalie `http://localhost:${KESTRA_HTTP_PORT:-8080}/metrics` para integração futura com Prometheus.

## Troubleshooting rápido

1. **Porta ocupada**: ajuste `KESTRA_HTTP_PORT`/`KESTRA_MANAGEMENT_PORT` no `.env` (ou use `--port`) e reinicie.
2. **Permissão negada no socket**: adicione o usuário ao grupo `docker` ou execute com sudo.
3. **Falha ao conectar ao Postgres**: confirme o serviço `tools-kestra-postgres`, credenciais no `.env` e a rede `tradingsystem_backend`.
4. **Health 404**: verifique logs (`tools/kestra/scripts/logs.sh`) e confirme se o endpoint `/health` na porta de management está acessível.
5. **Armazenamento sem permissão**: valide permissões em `tools/kestra/storage` e `tools/kestra/workdir` (crie com `mkdir -p` quando necessário).

## Estrutura

```
tools/kestra/
├── README.md
├── docs/             # Documentação complementar (controle interno)
├── scripts/          # Wrappers padronizados (run/status/logs/stop)
├── storage/          # Persistência do Kestra (flows, execuções, anexos)
└── workdir/          # Diretório temporário para tasks (`/tmp/kestra-wd`)
```
