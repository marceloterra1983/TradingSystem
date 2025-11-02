## Change Proposal — add-kestra-orchestrator

### Why
- Operações precisam orquestrar pipelines de dados (ETL de sinais, normalização de ordens, rotinas de compliance) sem depender de jobs manuais ou scripts isolados.
- O roadmap inclui fluxos recorrentes (ingestão de históricos, saneamento de dados, geração de relatórios) que exigem agendamento, versionamento e observabilidade centralizada.
- A governança do projeto requer que novas automações sejam auto-hospedadas, auditáveis e integradas ao ecossistema Docker Compose existente.
- Kestra oferece orquestração declarativa, suporte nativo a Postgres, filas internas e API/GUI para operar fluxos, tornando-o adequado ao contexto on-premise.

### O que vai mudar
- Adicionar Kestra como ferramenta operacional no stack Tools executando `server standalone` com Postgres dedicado (serviço `tools-kestra-postgres`) e volumes persistentes (`tools/kestra/storage`, `tools/kestra/workdir`).
- Criar diretório `tools/kestra/` com scripts utilitários (`run.sh`, `stop.sh`, `logs.sh`, `status.sh`) encapsulando o comando oficial (incluindo `--detach`, `--port`, `--management-port`) e injetando `KESTRA_CONFIGURATION` com credenciais do Postgres/Basic Auth.
- Garantir conformidade com governança Docker: contêiner nomeado `tools-kestra`, rede `tradingsystem_backend`, publicação das portas HTTP e management parametrizadas via `.env`, healthcheck ativo e dependência explícita do Postgres.
- Atualizar scripts `scripts/docker/start-stacks.sh`/`stop-stacks.sh` e `config/services-manifest.json` para gerenciar Kestra via Docker Compose (com opção `SKIP_Kestra_AUTO_START`).
- Integrar Kestra ao ecossistema operacional: health-check via Service Launcher (`apps/status`), monitoração básica (`health-check-all`, `docker stats`) e documentação operacional descrevendo execução/parada, diretórios persistentes e rotação de credenciais.
- Documentar onboarding completo em `docs/context/ops/orchestration/kestra.md`, incluindo dependências (Docker socket, Postgres), variáveis de ambiente e boas práticas de segurança.

### Timeline estimado (≈ 3–4 dias)
1. **Discovery & design (0,5 dia)** — validar requisitos oficiais do comando, montar diretórios locais e política de permissões.
2. **Automação & integração (1,5–2 dias)** — scripts wrapper, atualizações em manifestos, health-checks e Service Launcher.
3. **Documentação & validação (1 dia)** — escrever guia operacional, ajustes em `.env.example` se necessário, smoke test do comando.

### Critérios de sucesso
- Serviço `kestra` configurado em `tools/compose/docker-compose.tools.yml` sobe via `docker compose -f tools/compose/docker-compose.tools.yml up -d kestra`, expondo portas HTTP/management conforme `.env` e aguardando o healthcheck do Postgres.
- `tools/kestra/scripts/run.sh` (modo manual) executa `docker run ... kestra/kestra:latest server standalone`, monta storage/workdir e injeta a configuração do Postgres/Basic Auth.
- `scripts/docker/start-stacks.sh --phase tools` inicia o Compose da stack e o Kestra aparece no group "Tools".
- Service Launcher e checklists exibem status “running” quando o processo está ativo; logs acessíveis via script dedicado.
- Documentação cobre execução, troubleshooting e segurança (binding do Docker socket, privilégios root).
- `openspec validate add-kestra-orchestrator --strict` passa sem apontar pendências.

### Riscos & Mitigações
- **Uso de tag `latest`**: para compliance com comando oficial, o script utiliza `--pull=always`. Documentar que ambientes críticos podem fixar versão se permitido futuramente.
- **Privilégios elevados**: contêiner roda como root e monta `/var/run/docker.sock`; reforçar controles de acesso e uso apenas por operadores autorizados.
- **Segredos sensíveis**: credenciais de Postgres e Basic Auth residem no `.env`; reforçar governança de segredos e rotação periódica.
- **Volumes locais**: storage/workdir residem em `tools/kestra/`; garantir permissões adequadas e políticas de backup.
