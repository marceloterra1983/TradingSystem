# Implementation Tasks: Add Kestra Orchestrator

> **Important**: Execute tasks em ordem. Marque `[x]` apenas após validar.

---

## 1. Discovery & Pré-Requisitos

**Objective**: Garantir que ambiente suporta o comando oficial do Kestra antes de criar wrappers.

- [ ] 1.1 **Mapear referências existentes a Kestra**
  ```bash
  rg -n "kestra" .
  ```
  **Validation**: Resultado vazio confirma ausência de configurações conflitantes.

- [ ] 1.2 **Verificar disponibilidade de recursos (porta, storage, memória)**
  ```bash
  ss -tulpn | grep 8080 || echo "Port 8080 livre"
  df -h /home/marce
  ```
  **Validation**: Porta escolhida livre e espaço ≥ 5 GB para persistência temporária.

- [ ] 1.3 **Confirmar credenciais no `.env` raiz**
  ```bash
  grep -E "POSTGRES_|TIMESCALE" .env
  ```
  **Validation**: `.env` possui dados suficientes para derivar novas variáveis (`KESTRA_*`) se necessário.

- [ ] 1.4 **Revisar governança e naming conventions**
  ```bash
  cat docs/governance/CONTAINER-NAMING-CONVENTION.md
  cat docs/context/ops/service-port-map.md
  ```
  **Validation**: Entender padrão `tools-*` e portas livres antes de adicionar Kestra.

- [ ] 1.5 **Confirmar requisitos do comando oficial**
  ```bash
  docker --version
  docker info --format '{{.ServerVersion}}'
  ```
  **Validation**: Docker instalado, daemon saudável e com permissão de montar `/var/run/docker.sock`. Registrar no design o impacto de `--user=root`.

---

## 2. Scaffold de Configuração

**Objective**: Preparar estrutura de scripts para execução via `docker run`.

- [ ] 2.1 **Criar diretório base para Kestra**
  ```bash
  mkdir -p tools/kestra/{scripts,docs,tmp}
  touch tools/kestra/README.md
  ```
  **Validation**: Diretórios criados com permissões corretas (`stat -c '%a'` deve retornar 755).

- [ ] 2.2 **Criar wrapper `run.sh`**
  - Requisitos:
    - Carregar `.env` raiz automaticamente (`set -o allexport` + `source`).
    - Oferecer flag `--detach/-d` para trocar `-it` por `-d` (modo background).
    - Garantir existência de `tools/kestra/storage` e `tools/kestra/workdir` (`mkdir -p`).
    - Registrar comando/porta antes de executar.
    - Executar `docker run --pull=always --rm` mapeando socket Docker, storage persistente e workdir temporário.
  - **Validation**: `tools/kestra/scripts/run.sh --detach` sobe contêiner em background (verificar com `docker ps`); `run.sh` sem flag mantém modo interativo.

- [ ] 2.3 **Criar scripts auxiliares**
  - `status.sh`: listar contêineres (`docker ps --filter ancestor=kestra/kestra:latest`) com cabeçalho tabular.
  - `logs.sh`: localizar primeiro contêiner ativo, abortar com mensagem amigável caso não exista, seguir logs via `docker logs -f`.
  - `stop.sh`: parar todos os contêineres derivados da imagem, imprimindo confirmação por ID.
  - Marcar scripts como executáveis.
  - **Validation**: Cada script responde conforme esperado (`status` lista ou informa ausência, `logs` segue contêiner ativo, `stop` encerra e reporta).

- [ ] 2.4 **Inicializar README com instruções completas**
  - Seções mínimas: Pré-requisitos, Comandos principais, Integrações de stack (`start-stacks`/`stop-stacks`), Segurança, Monitoramento manual, Troubleshooting.
  - Documentar variáveis (`KESTRA_HTTP_PORT`, `KESTRA_MANAGEMENT_PORT`, `KESTRA_DB_*`, `KESTRA_BASICAUTH_*`, `KESTRA_DOCKER_NETWORK`, `KESTRA_CONTAINER_NAME`) e riscos de rodar como root com socket Docker.
  - Explicar convenção de nome (`tools-kestra`) e rede (`tradingsystem_backend`).
  - **Validation**: README descreve claramente uso dos scripts, medidas de segurança e comandos de monitoramento.

---

## 3. Scripts e Manifestos

**Objective**: Integrar o Kestra à stack Tools via Compose e scripts compartilhados.

- [ ] 3.1 **Adicionar serviços no `tools/compose/docker-compose.tools.yml`**
  - Declarar `kestra` com `image: kestra/kestra:latest`, `container_name: tools-kestra`, `command: server standalone`, `user: root` e `depends_on` com condição `service_healthy` para `kestra-postgres`.
  - Mapear `${KESTRA_HTTP_PORT:-8080}:8080` e `${KESTRA_MANAGEMENT_PORT:-8081}:8081`; montar `/var/run/docker.sock`, `${KESTRA_WORKDIR_DIR:-../kestra/workdir}:/tmp/kestra-wd` e `${KESTRA_STORAGE_DIR:-../kestra/storage}:/app/storage`.
  - Definir `KESTRA_CONFIGURATION` com datasource Postgres (`KESTRA_DB_*`), storage local e autenticação básica (`KESTRA_BASICAUTH_*`).
  - Criar serviço `kestra-postgres` (`postgres:15-alpine`) com volume nomeado (`kestra-postgres-data`) e variáveis `POSTGRES_*` derivadas dos mesmos segredos.
  **Validation**: `docker compose -f tools/compose/docker-compose.tools.yml config --services | grep kestra-postgres` retorna ambos os serviços.

- [ ] 3.2 **Adicionar variáveis no `.env`, `.env.example`**
  ```bash
  cat >> .env.example <<'EOF'
  # Kestra Orchestrator
  KESTRA_HTTP_PORT=8080
  KESTRA_MANAGEMENT_PORT=8081
  KESTRA_DB_HOST=kestra-postgres
  KESTRA_DB_PORT=5432
  KESTRA_DB_NAME=kestra
  KESTRA_DB_USER=kestra
  KESTRA_DB_PASSWORD="CHANGE_ME_SECURE_PASSWORD"
  KESTRA_BASICAUTH_USERNAME=admin@tradingsystem.local
  KESTRA_BASICAUTH_PASSWORD="ChangeMe123!"
  EOF
  ```
  **Validation**: `diff` entre `.env` e `.env.example` mostra apenas placeholders novos.

- [ ] 3.3 **Atualizar `config/services-manifest.json`**
  - Criar entrada `kestra-orchestrator` com:
    ```json
    {
      "id": "kestra-orchestrator",
      "type": "tools",
      "path": "tools/kestra",
      "start": "docker compose -f tools/compose/docker-compose.tools.yml up -d kestra",
      "stop": "docker compose -f tools/compose/docker-compose.tools.yml stop kestra",
      "status": "tools/kestra/scripts/status.sh",
      "stack": "tools",
      "managed": "docker-compose",
      "workspace": true
    }
    ```
  **Validation**: `jq '.services[] | select(.id=="kestra-orchestrator")' config/services-manifest.json`.

- [ ] 3.4 **Integrar scripts Docker**
  ```bash
  ./scripts/docker/start-stacks.sh --phase tools
  SKIP_Kestra_AUTO_START=1 ./scripts/docker/start-stacks.sh --phase tools
  docker compose -f tools/compose/docker-compose.tools.yml up -d kestra
  ./scripts/docker/stop-stacks.sh
  ```
  **Validation**: Stack `tools` sobe Kestra via Compose por padrão (permite pular com variável) e comandos manuais funcionam para start/stop isolado.

- [ ] 3.5 **Atualizar Service Launcher (`apps/status`)**
  - Adicionar descritor `kestra-orchestrator` com health-check baseado em `http://localhost:${KESTRA_MANAGEMENT_PORT:-8081}/health` (fallback: `docker ps`).
  - Incluir link rápido para UI do Kestra.
  **Validation**: `curl http://localhost:3500/api/services | jq '.[] | select(.id=="kestra-orchestrator")'`.

- [ ] 3.6 **Integrar health-checks automáticos**
  ```bash
  sed -n '1,200p' scripts/maintenance/health-check-all.sh | grep -n "Kestra" || echo "Adicionar bloco de check para Kestra"
  ```
  - Incluir verificação (`docker ps` + `curl`) e mensagem amigável conforme padrão existente (porta de management por padrão 8081).
  **Validation**: Executar `bash scripts/maintenance/health-check-all.sh --services kestra` (ou equivalente) e observar status correto.

---

## 4. Observabilidade & Segurança

**Objective**: Documentar riscos do comando e garantir monitoramento básico.

- [ ] 4.1 **Atualizar README com considerações de segurança**
  ```bash
  cat >> tools/kestra/README.md <<'EOF'
  ## Segurança
  - O comando oficial roda como `root` e monta `/var/run/docker.sock`; restrinja o uso a operadores autorizados.
  - Garanta permissões de leitura/escrita em `tools/kestra/storage` e `tools/kestra/workdir` (ajuste os caminhos via `KESTRA_STORAGE_DIR`/`KESTRA_WORKDIR_DIR` se necessário).
  - Proteja a porta 8080 (VPN, firewall, autenticação reversa).
  EOF
  ```
  **Validation**: README descreve riscos e controles.

- [ ] 4.2 **Documentar monitoramento manual**
  ```bash
  cat >> tools/kestra/README.md <<'EOF'
  ## Monitoramento
  - `tools/kestra/scripts/status.sh` lista contêiner em execução.
- `docker stats --no-stream $(docker ps --filter "ancestor=kestra/kestra:latest" -q)` coleta consumo de recursos.
- `docker inspect $(docker ps --filter "ancestor=kestra/kestra:latest" -q | head -n1)` revisa mounts, portas e limites aplicados.
- `curl -fsS http://localhost:${KESTRA_MANAGEMENT_PORT:-8081}/health` (fallback `/actuator/health` na porta HTTP principal).
- Caso o modo `server standalone` exponha métricas (ex.: `/metrics`), registre aqui.
  EOF
  ```
  **Validation**: README orienta operadores sobre observabilidade simples.

- [ ] 4.3 **Verificar scripts de logs**
  ```bash
  tools/kestra/scripts/logs.sh
  ```
  **Validation**: Logs aparecem quando o contêiner está ativo; README referencia o comando.

---

## 5. Testes, QA e Documentação

**Objective**: Validar funcionamento end-to-end e atualizar materiais oficiais.

- [ ] 5.1 **Smoke test com wrapper**
  ```bash
  tools/kestra/scripts/run.sh --detach --port 8090 --management-port 8650
  sleep 15
  tools/kestra/scripts/status.sh
  curl -fsS http://localhost:${KESTRA_MANAGEMENT_PORT:-8650}/health || echo "Health endpoint indisponível"
  tools/kestra/scripts/stop.sh
  ```
  **Validation**: Kestra aparece em `docker ps` durante o teste; `stop.sh` encerra o contêiner sem erros.

- [ ] 5.2 **Atualizar documentação**
  - `docs/context/ops/service-port-map.md`: adicionar Kestra, porta, método de start/stop.
  - Criar `docs/context/ops/orchestration/kestra.md` com onboarding completo (instalação, execução, troubleshooting).
  - Atualizar `docs/context/ops/runbooks/` com runbook de restart e checklist operacional.
  **Validation**: `npm run validate-docs` finaliza sem erros.

- [ ] 5.3 **Checklist final**
  ```bash
  tools/kestra/scripts/status.sh
  docker ps --filter 'ancestor=kestra/kestra:latest' --format 'table {{.ID}}\t{{.Status}}\t{{.RunningFor}}'
  ```
  **Validation**: Scripts retornam informações corretas; processo gerenciável.

- [ ] 5.4 **Execução de validação OpenSpec**
  ```bash
  openspec validate add-kestra-orchestrator --strict
  ```
  **Validation**: Sem apontamentos. Registrar saída no PR.

---

## Success Criteria

✅ Kestra executa via comando oficial `docker run --pull=always --rm ... kestra/kestra:latest server standalone`.  
✅ Scripts wrappers permitem start/stop/status/logs integrados ao stack Tools.  
✅ Documentação e `.env.example` orientam configuração (porta, diretório temporário, segurança).  
✅ Service Launcher e operadores conseguem monitorar a execução do Kestra.  
✅ OpenSpec valida sem erros, sinalizando prontidão para implementação.
