---
title: Kestra Orchestrator (Tools Stack)
sidebar_position: 10
---

Kestra fornece orquestração de jobs declarativos on-premise. No TradingSystem ele roda na stack **Tools** com persistência em Postgres e armazenamento local dedicado, podendo ser iniciado tanto via Docker Compose quanto pelos wrappers `tools/kestra/scripts/*.sh`.

## Visão geral

- **Imagem**: `kestra/kestra:latest` (sempre atualizada com `--pull=always`).
- **Portas padrão**: `8080` (HTTP principal via `KESTRA_HTTP_PORT`) e `8081` (management/health via `KESTRA_MANAGEMENT_PORT`).
- **Execução**: serviço `tools-kestra` com comando `server standalone`, dependente do contêiner `tools-kestra-postgres`. Wrappers em `tools/kestra/scripts/` permitem execução manual.
- **Rede/Container**: utiliza a rede `tradingsystem_backend` e mantém o padrão de nomenclatura `tools-*`.
- **Persistência**: Postgres dedicado (`tools-kestra-postgres`) e volumes bind em `tools/kestra/storage` (dados) e `tools/kestra/workdir` (workspace temporário).

## Pré-requisitos

1. Docker instalado (CLI + daemon) com acesso ao socket `/var/run/docker.sock`.
2. Usuário no grupo `docker` (ou root) para executar `docker run`.
3. Variáveis preenchidas no `.env` raiz:
   ```dotenv
   KESTRA_HTTP_PORT=8080
   KESTRA_MANAGEMENT_PORT=8081
   KESTRA_DB_HOST=kestra-postgres
   KESTRA_DB_PORT=5432
   KESTRA_DB_NAME=kestra
   KESTRA_DB_USER=kestra
   KESTRA_DB_PASSWORD="<senha forte>"
   KESTRA_BASICAUTH_USERNAME=admin@tradingsystem.local
   KESTRA_BASICAUTH_PASSWORD="<senha forte>"
   ```
   > ℹ️ No ambiente padrão, usamos `KESTRA_HTTP_PORT=8180` e `KESTRA_MANAGEMENT_PORT=8685` para evitar conflito com o Timescale Admin (8080).
4. Diretórios `tools/kestra/storage` e `tools/kestra/workdir` com permissão de escrita (criados automaticamente ao subir o serviço).

## Como iniciar

```bash
# Subir apenas o Kestra (stack Tools) via Compose
docker compose -f tools/compose/docker-compose.tools.yml up -d kestra

# Subir stack Tools completa (Kestra incluído)
bash scripts/docker/start-stacks.sh --phase tools

# Alternativa manual interativa (fora do Compose)
tools/kestra/scripts/run.sh --management-port 8685

# Alternativa manual em background
tools/kestra/scripts/run.sh --detach
```

O script `run.sh` carrega o `.env` raiz automaticamente, valida as credenciais do Postgres e monta os diretórios `storage`/`workdir` antes de iniciar `server standalone`.

## Como parar

```bash
# Parar somente o serviço via Compose
docker compose -f tools/compose/docker-compose.tools.yml stop kestra

# Rotina completa (stack Tools)
bash scripts/docker/stop-stacks.sh

# Encerrar apenas o contêiner (modo manual)
tools/kestra/scripts/stop.sh
```

## Monitoramento e verificação

| Ação | Comando |
|------|---------|
| Listar contêiner | `tools/kestra/scripts/status.sh` |
| Ver logs | `tools/kestra/scripts/logs.sh` |
| Prova de saúde | `curl -fsS http://localhost:${KESTRA_MANAGEMENT_PORT}/health` (fallback `/actuator/health` na porta HTTP principal) |
| Uso de recursos | `docker stats --no-stream $(docker ps --filter "ancestor=kestra/kestra:latest" -q)` |

O script `scripts/maintenance/health-check-all.sh` inclui a verificação do Kestra e retorna status `down`/`degraded` caso o contêiner esteja inativo ou a sonda HTTP falhe.

## Integrações

- **Service Launcher**: exibe status `kestra-orchestrator` e link para a UI.
- **services-manifest.json**: entrada `kestra-orchestrator` (`managed: "docker-compose"`, `stack: "tools"`).
- **scripts/docker/start-stacks.sh**: tenta subir Kestra automaticamente, mas se detectar conflito de porta (`KESTRA_HTTP_PORT` ou `KESTRA_MANAGEMENT_PORT`), inicia apenas os demais serviços e orienta ajustar o ambiente antes de uma nova tentativa.
- **Port map**: documentado em `docs/context/ops/service-port-map.md`.

## Segurança

- Os contêineres `tools-kestra` e `tools-kestra-postgres` rodam como `root` e acessam o socket Docker. Restrinja o uso a operadores confiáveis.
- Proteja as portas expostas (`KESTRA_HTTP_PORT`, `KESTRA_MANAGEMENT_PORT`) com VPN/firewall ou reverse proxy quando houver acesso externo.
- Armazene senhas (Postgres e Basic Auth) apenas no `.env` e rotacione periodicamente. Inclua `tools/kestra/storage` nos backups ou políticas de retenção.

## Troubleshooting

| Sintoma | Ação sugerida |
|---------|---------------|
| `permission denied` no socket | Verifique se o usuário está no grupo `docker` ou reexecute com sudo. |
| Porta HTTP/management ocupada | Ajuste `KESTRA_HTTP_PORT`/`KESTRA_MANAGEMENT_PORT` e reinicie via `stop.sh` → `run.sh --detach`. |
| UI carrega mas health check falha | Revise logs (`tools/kestra/scripts/logs.sh`), confirme serviço `tools-kestra-postgres` e conexões via rede `tradingsystem_backend`. |
| Erros de conexão com banco | Verifique variáveis `KESTRA_DB_*`, reinicie `tools-kestra-postgres` e confirme credenciais. |
| Storage sem permissão | Garanta que `tools/kestra/storage` e `tools/kestra/workdir` são graváveis pelo usuário atual. |
| Health 404 | Valide `/health` na porta de management; se necessário, teste `/actuator/health` e confira inicialização. |

## Roadmap

- Habilitar métricas em `http://localhost:${KESTRA_HTTP_PORT}/metrics` para Prometheus quando necessário.
- Integrar autenticação corporativa (reverse proxy / SSO) conforme expansão de acesso externo.
- Monitorar uso de armazenamento e planejar migração para backend S3/MinIO caso fluxos aumentem significativamente.
