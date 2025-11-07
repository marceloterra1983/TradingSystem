---
title: Runbook — Reinício do Kestra
sidebar_position: 20
---

> Procedimento para reiniciar o orquestrador Kestra provisionado na stack Tools (Compose), mantendo wrappers `docker run` disponíveis para fallback pontual.

## Quando executar

- Atualização da imagem (`kestra/kestra:latest`).
- Aplicação de mudanças em `.env` (portas, credenciais do Postgres ou Basic Auth).
- Recuperação após falha ou travamento.

## Passo a passo

1. **Verificar estado atual**
   ```bash
   tools/kestra/scripts/status.sh || true
   ```
   - Caso não haja contêiner ativo, prossiga para o passo 4.

2. **Salvar logs antes de desligar (opcional)**
   ```bash
   tools/kestra/scripts/logs.sh
   ```

3. **Encerrar o contêiner**
   ```bash
   tools/kestra/scripts/stop.sh
   ```
   - Espere o retorno `✓ <ID> interrompido` ou `Nenhum contêiner em execução`.

4. **Ajustar variáveis (se necessário)**
   - Editar `.env` e conferir `KESTRA_HTTP_PORT`, `KESTRA_MANAGEMENT_PORT`, `KESTRA_DB_*` e `KESTRA_BASICAUTH_*`.

5. **Iniciar novamente**
   ```bash
   tools/kestra/scripts/run.sh --detach
   ```
   - Alternativas:
     - `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra`
     - `bash scripts/docker/start-stacks.sh --phase tools` (use `SKIP_Kestra_AUTO_START=1` para pular o Kestra; se a porta estiver ocupada, o script mantém os demais serviços ativos e alerta para ajustar `KESTRA_HTTP_PORT`/`KESTRA_MANAGEMENT_PORT`).

6. **Validar**
   ```bash
   tools/kestra/scripts/status.sh
   curl -fsS http://localhost:${KESTRA_MANAGEMENT_PORT:-8081}/health
   ```
   - `scripts/maintenance/health-check-all.sh --services kestra` deve retornar `overallHealth=healthy`.

## Troubleshooting

- **`permission denied`**: execute `sudo usermod -aG docker <usuario>` e reabra a sessão.
- **Porta em uso**: atualize `KESTRA_HTTP_PORT`/`KESTRA_MANAGEMENT_PORT` para valores livres (`ss -ltn | grep <porta>`).
- **Health check falha**: verifique logs (`tools/kestra/scripts/logs.sh`) e confirme se `tools-kestra-postgres` está saudável (`docker ps`, `docker logs tools-kestra-postgres`).
- **Erro de autenticação**: valide `KESTRA_BASICAUTH_USERNAME/KESTRA_BASICAUTH_PASSWORD` e, se necessário, redefina no `.env` antes de reiniciar.
- **Atualização de imagem**: após `stop.sh`, rode `docker pull kestra/kestra:latest` e volte ao passo 5.

## Pós-ação

- Atualizar dashboards verificando se o status voltou para `healthy`.
- Registrar problemas ou anomalias em `docs/context/ops/orchestration/kestra.md` na seção de troubleshooting.
