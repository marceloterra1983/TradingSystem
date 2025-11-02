# Raio X dos Comandos Claude Code

Resumo rapido com capacidades, momento ideal, exemplo concreto de aplicacao, tipo de saida gerada e principais variacoes de uso para cada comando customizado do TradingSystem.

## Referencia e Organizacao

### `/all-tools`
- **Capacidades**: Lista todas as ferramentas MCP habilitadas mostrando assinatura e proposito.
- **Momento ideal**: Antes de iniciar uma sessao de automacao para saber quais recursos (filesystem, github, docker etc.) estao acessiveis.
- **Exemplo de momento**: Quando for planejar uma acao complexa (ex.: rodar scripts em serie) e quiser validar se o servidor docker MCP esta ativo.
- **Tipo de saida**: Lista textual em bullets com nome da ferramenta, assinatura TypeScript e breve descricao.
- **Exemplos**: `/all-tools`

### `/docs-maintenance`
- **Capacidades**: Audita a documentacao (links, estrutura, estilo) e propaga correcoes.
- **Momento ideal**: Nos sprints de governanca da base Docusaurus para evitar links quebrados antes de publicar relatorios semanais.
- **Exemplo de momento**: Na vespera de enviar o `DOCUSAURUS-REVIEW-REPORT` para diretoria, garantindo que nao ha links mortos.
- **Tipo de saida**: Relatorio textual com achados da auditoria, tarefas priorizadas e comandos sugeridos para correcao.
- **Exemplos**: `/docs-maintenance --audit`, `/docs-maintenance --update`, `/docs-maintenance --validate`, `/docs-maintenance --optimize`, `/docs-maintenance --comprehensive`

### `/update-docs`
- **Capacidades**: Sincroniza docs com status de implementacao, marcando progresso e melhores praticas.
- **Momento ideal**: Ao concluir uma feature ou fase de auditoria (ex.: workflow tp-capital) para refletir novas decisoes nos relatorios.
- **Exemplo de momento**: Depois de finalizar o script `validar-tp-capital-completo.sh`, registrando ajustes em `NEXT-STEPS-ACTION-PLAN.md`.
- **Tipo de saida**: Checklist e plano de atualizacao de arquivos, apontando quais documentos editar e quais marcadores atualizar.
- **Exemplos**: `/update-docs --implementation`, `/update-docs --api`, `/update-docs --architecture`, `/update-docs --sync`, `/update-docs --validate`

### `/create-onboarding-guide`
- **Capacidades**: Gera guia de onboarding completo com setup, workflows e treinamentos.
- **Momento ideal**: Quando um novo dev entra no time e precisa entender arquitetura limpa + pipelines Docker rapidamente.
- **Exemplo de momento**: Ao integrar um analista que vai cuidar da esteira `docs/search`, fornecendo roteiro com ferramentas essenciais.
- **Tipo de saida**: Estrutura de guia em markdown detalhando topicos, passos e recursos de apoio para o novo integrante.
- **Exemplos**: `/create-onboarding-guide --developer`, `/create-onboarding-guide --designer`, `/create-onboarding-guide --devops`, `/create-onboarding-guide --comprehensive`, `/create-onboarding-guide --interactive`

### `/troubleshooting-guide`
- **Capacidades**: Monta guias sistematicos de diagnostico com comandos de verificacao e causas provaveis.
- **Momento ideal**: Depois de resolver um incidente (ex.: falha na ingestao do ProfitDLL) para registrar passos de resolucao.
- **Exemplo de momento**: Logo apos corrigir um erro 500 na rota `/api/rag/query`, evitando perder o passo a passo de correcao.
- **Tipo de saida**: Documento orientado por secoes (sintomas, causas, comandos) pronto para publicar em docs operacionais.
- **Exemplos**: `/troubleshooting-guide --application`, `/troubleshooting-guide --database`, `/troubleshooting-guide --network`, `/troubleshooting-guide --deployment`, `/troubleshooting-guide --comprehensive`

### `/todo`
- **Capacidades**: Mantem o arquivo `todos.md` com tarefas ativas/completas.
- **Momento ideal**: Para pequenos lembretes ou acao rapida durante pares de programacao sem abrir ferramentas externas.
- **Exemplo de momento**: Durante uma revisao de PR quando surge um ajuste futuro, anotando em `todos.md` sem sair do fluxo.
- **Tipo de saida**: Atualizacao direta no arquivo `todos.md` com listas markdown formatadas conforme padrao do projeto.
- **Exemplos**: `/user:todo add "Revalidar health-check docs"`, `/user:todo complete 1`, `/user:todo remove 2`, `/user:todo list`, `/user:todo past due`

## Planejamento e Orquestracao

### `/start` (orchestrate)
- **Capacidades**: Ativa o orquestrador de tarefas que decompoe backlog, gera estrutura e dependencias.
- **Momento ideal**: Ao iniciar uma iniciativa ampla como o ciclo "workflow rag query" para criar plano coordenado.
- **Exemplo de momento**: No kick-off de uma sprint que envolve backend, frontend e docs, distribuindo tarefas automagicamente.
- **Tipo de saida**: Conjunto de arquivos em `task-orchestration/` com plano mestre, tracker e tarefas decomposedas.
- **Exemplos**: `/start`, `/start --focus performance`, `/start --analyze-only`

### `/workflow-orchestrator`
- **Capacidades**: Cria, agenda e monitora workflows automatizados com dependencias e notificacoes.
- **Momento ideal**: Para encadear scripts (ex.: validar env, rodar health check e publicar relatorios) em uma rotina diaria.
- **Exemplo de momento**: Automatizar o pipeline noturno que valida Kestra, coleta logs e atualiza o `STATUS-FINAL-LOGS`.
- **Tipo de saida**: Definicao detalhada de workflow (json/yaml ou markdown) e relatorio textual de execucao/monitoramento.
- **Exemplos**: `/workflow-orchestrator create nightly-health-check`, `/workflow-orchestrator run nightly-health-check`, `/workflow-orchestrator schedule nightly-health-check --cron "0 2 * * *"`, `/workflow-orchestrator monitor nightly-health-check`

### `/task-find`
- **Capacidades**: Busca tarefas em planos existentes por status, agente, prioridade ou padrao.
- **Momento ideal**: Quando precisa localizar rapidamente um item bloqueado em `task-orchestration` antes de realocar recursos.
- **Exemplo de momento**: Procurar tarefas relacionadas a "kestra" para validar se ha pendencias antes do deploy de automacoes.
- **Tipo de saida**: Listagem textual dos itens encontrados com caminho do arquivo e status atual.
- **Exemplos**: `/task-find TASK-001`, `/task-find "authentication"`, `/task-find --status in_progress`, `/task-find --regex "TASK-0[0-9]{2}"`, `/task-find --tree --root TASK-010`

### `/create-feature`
- **Capacidades**: Fornece roteiro de planejamento, implementacao e testes de uma nova feature ponta a ponta.
- **Momento ideal**: Ao iniciar desenvolvimento de um novo agregado (ex.: PositionAggregate) garantindo aderencia ao DDD.
- **Exemplo de momento**: Antes de criar endpoints para ingestao de sinais customizados, definindo passos e impactos.
- **Tipo de saida**: Plano em markdown com etapas, checklist tecnico e dependencias cruzadas para a feature.
- **Exemplos**: `/create-feature position-aggregate`, `/create-feature rag-embeddings`

### `/system-behavior-simulator`
- **Capacidades**: Orienta simulacoes de carga e cenarios de capacidade com analise de gargalos.
- **Momento ideal**: Antes de abrir janela de alta volatilidade no mercado, para prever comportamento das APIs de execucao.
- **Exemplo de momento**: Planejar teste de carga do TP Capital apos otimizar consulta no Timescale, medindo elasticidade.
- **Tipo de saida**: Roteiro detalhado de simulacao contendo cenarios, metricas alvo e interpretacao esperada dos resultados.
- **Exemplos**: `/system-behavior-simulator tp-capital --load-peak`, `/system-behavior-simulator documentation-api --failure-scenarios`

## Arquitetura e Estrategia

### `/ultra-think`
- **Capacidades**: Modo de analise profunda com avaliacoes tecnica, negocio, usuario e sistema.
- **Momento ideal**: Para deliberar decisoes criticas (ex.: migrar parte do fluxo RAG para microservico dedicado).
- **Exemplo de momento**: Avaliar se vale substituir LlamaIndex por outra stack para reduzir tempo de ingestao.
- **Tipo de saida**: Analise extensa em texto estruturado com opcoes avaliadas, trade-offs e recomendacao final.
- **Exemplos**: `/ultra-think Devemos separar o proxy RAG em microservico independente?`, `/ultra-think Qual estrategia seguir para reduzir o custo de ingestao de dados?`

### `/architecture-review`
- **Capacidades**: Faz auditoria arquitetural completa (estrutura, dependencias, seguranca, testes).
- **Momento ideal**: No fechamento de esteiras de auditoria (ex.: tp-capital) antes de aprovar refatores estruturais.
- **Exemplo de momento**: Verificar se o `docs/documentation-api` segue principios de clean architecture antes de um refactor.
- **Tipo de saida**: Relatorio tecnico em markdown destacando achados, riscos, metricas e plano de melhorias.
- **Exemplos**: `/architecture-review backend --dependencies`, `/architecture-review frontend --modules`, `/architecture-review --security`

### `/create-architecture-documentation`
- **Capacidades**: Gera docs arquiteturais C4, ADRs e diagramas PlantUML/Structurizr.
- **Momento ideal**: Quando novas decisoes impactam a topologia (ex.: adicionar novo servico websocket) e precisam ser registradas.
- **Exemplo de momento**: Documentar o fluxo de webhooks do TP Capital apos criar diagramas em `outputs/workflow-tp-capital`.
- **Tipo de saida**: Pacote de artefatos (diagramas, ADRs, resumos) prontos para incorporar ao repositorio de arquitetura.
- **Exemplos**: `/create-architecture-documentation --c4-model`, `/create-architecture-documentation --arc42`, `/create-architecture-documentation --adr`, `/create-architecture-documentation --plantuml`, `/create-architecture-documentation --full-suite`

### `/design-rest-api`
- **Capacidades**: Estrutura recursos HTTP, contratos, autenticacao e versionamento seguindo boas praticas REST.
- **Momento ideal**: Antes de implementar novas rotas (ex.: ampliar documentation API) para alinhar contrato com stakeholders.
- **Exemplo de momento**: Planejar a API que servira documentos versionados no dashboard antes de abrir tarefas de desenvolvimento.
- **Tipo de saida**: Especificacao de API em texto estruturado (tabela de endpoints, esquemas, fluxos de auth) e possivel draft OpenAPI.
- **Exemplos**: `/design-rest-api --v1 documentation-api`, `/design-rest-api --v2 workspace-api`, `/design-rest-api --graphql-hybrid`, `/design-rest-api --openapi`

### `/design-database-schema`
- **Capacidades**: Modela entidades, chaves e relacionamentos equilibrando normalizacao e performance.
- **Momento ideal**: Durante discovery de novas tabelas ou ajustes (ex.: TimescaleDB) para evitar retrabalho depois de codar.
- **Exemplo de momento**: Definir estrutura da tabela de auditoria de ordens antes de criar migracoes para Timescale e QuestDB.
- **Tipo de saida**: Desenho de schema com diagramas/DDL sugerido, lista de entidades e justificativas de arquitetura de dados.
- **Exemplos**: `/design-database-schema --relational signals`, `/design-database-schema --nosql telemetry`, `/design-database-schema --hybrid analytics`, `/design-database-schema --normalize`

### `/create-database-migrations`
- **Capacidades**: Gera arquivos de migracao com up/down, cobrindo alteracoes de schema e dados.
- **Momento ideal**: Logo apos aprovar o desenho do schema, garantindo trilha auditavel entre ambientes.
- **Exemplo de momento**: Criar migracao que adiciona coluna de latencia no Timescale apos documentar o schema correspondente.
- **Tipo de saida**: Scripts de migracao (arquivos em `migrations/`) acompanhados de instrucoes de execucao e rollback.
- **Exemplos**: `/create-database-migrations add_signal_latency --add-column`, `/create-database-migrations create_trades_table --create-table`, `/create-database-migrations adjust_positions --alter-table`

## Qualidade e Testes

### `/quality-check`
- **Capacidades**: Roda pipeline completo (lint, tipos, testes, audit, bundle, docker health).
- **Momento ideal**: Antes de abrir pull request ou iniciar deploy para garantir baseline de qualidade.
- **Exemplo de momento**: Validar o dashboard apos ajustar `collectionManager.ts` antes de subir artefatos para staging.
- **Tipo de saida**: Sumario textual dos checks executados, indicando sucessos/falhas e apontando logs correspondentes.
- **Exemplos**: `/quality-check`, `/quality-check --fix`, `/quality-check --full`, `/quality-check --full --format html`, `/quality-check --backend`

### `/code-review`
- **Capacidades**: Checklist de revisao cobrindo arquitetura, seguranca, performance e cobertura.
- **Momento ideal**: Durante revisao de PRs criticos (ex.: atualizacao de rag proxy) para nao esquecer riscos.
- **Exemplo de momento**: Revisar PR que altera `RagProxyService.js`, garantindo que fluxos de autorizacao estejam corretos.
- **Tipo de saida**: Lista de observacoes estruturadas com severidade, arquivos e linhas recomendadas para ajuste.
- **Exemplos**: `/code-review frontend/dashboard --full`, `/code-review backend/api/documentation-api`, `/code-review --security`

### `/lint`
- **Capacidades**: Executa ESLint por alvo com opcao de auto-fix.
- **Momento ideal**: Pos edicao de componentes React ou servicos Node para manter padrao de codigo.
- **Exemplo de momento**: Depois de ajustar `CollectionFilesTable.tsx`, garantindo que o componente siga regras do lint.
- **Tipo de saida**: Log de console mostrando erros/avisos de lint ou confirmando correcao automatica.
- **Exemplos**: `/lint`, `/lint --fix`, `/lint backend`, `/lint --file frontend/dashboard/src/App.tsx`, `/lint all`

### `/format`
- **Capacidades**: Aplica Prettier em escopos (frontend, backend, diretorios ou staged).
- **Momento ideal**: Antes do commit final garantindo consistencia no repo monorepo.
- **Exemplo de momento**: Normalizar formato dos arquivos em `frontend/dashboard/docs/` antes de gerar diff final para PR.
- **Tipo de saida**: Arquivos atualizados em disco e relatorio textual resumindo quais caminhos foram formatados.
- **Exemplos**: `/format`, `/format --check`, `/format src/components/`, `/format --staged`, `/format all`

### `/type-check`
- **Capacidades**: Roda TypeScript `--noEmit` em frontend e backends TS.
- **Momento ideal**: Ao integrar novas tipagens no dashboard (ex.: hooks RAG) para evitar regressao de build.
- **Exemplo de momento**: Depois de alterar `documentationService.ts`, validando contratos antes do build.
- **Tipo de saida**: Output de terminal com resultado do compilador (sem emissao de arquivos) destacando erros de tipo.
- **Exemplos**: `/type-check`, `/type-check --pretty`, `/type-check --file frontend/dashboard/src/components/DocsHybridSearchPage.tsx`, `/type-check --watch`, `/type-check all`

### `/test`
- **Capacidades**: Executa Vitest (coverage, watch, UI, all services).
- **Momento ideal**: Apos criar testes novos ou corrigir bugs em tp-capital para validar suites locais.
- **Exemplo de momento**: Ao ajustar `parseSignal.test.js`, confirmando que casos limite continuam verdes.
- **Tipo de saida**: Relatorio de testes (pass/fail, coverage quando solicitado) emitido via terminal.
- **Exemplos**: `/test`, `/test --coverage`, `/test --watch`, `/test --file DocsHybridSearchPage`, `/test all --coverage`

### `/generate-tests`
- **Capacidades**: Guia geracao de suites unitarias/integradas cobrindo mocks e edge cases.
- **Momento ideal**: Quando um modulo critico esta sem cobertura (ex.: RagProxyService) e precisa de plano detalhado.
- **Exemplo de momento**: Criar suite de testes para `server.ts` no `rag-services`, definindo cenarios de timeout e fallback.
- **Tipo de saida**: Plano de testes em texto com lista de casos, estrategias de mocking e scripts recomendados.
- **Exemplos**: `/generate-tests frontend/dashboard/src/services/documentationService.ts`, `/generate-tests tools/rag-services/src/server.ts`

### `/performance-audit`
- **Capacidades**: Auditoria de performance end-to-end (bundles, APIs, DB, rede).
- **Momento ideal**: Em ciclos de melhoria como o relatorio `03-performance-audit-tp-capital.md` para priorizar otimizacoes.
- **Exemplo de momento**: Antes de planejar sprint de performance, coletando dados de build e latencia atuais.
- **Tipo de saida**: Relatorio analitico com metricas coletadas, principais gargalos e backlog proposto de melhorias.
- **Exemplos**: `/performance-audit`, `/performance-audit --frontend`, `/performance-audit --backend`, `/performance-audit --full`

### `/audit`
- **Capacidades**: Executa `npm audit` com filtros, fix e relatorios.
- **Momento ideal**: Periodicamente ou apos atualizar dependencias para detectar vulnerabilidades antes de ir a producao.
- **Exemplo de momento**: Depois de aceitar uma PR que adiciona pacotes novos ao dashboard, verificando vulnerabilidades.
- **Tipo de saida**: Log de auditoria apontando vulnerabilidades por pacote, severidade e sugestao de correcao.
- **Exemplos**: `/audit`, `/audit --level high`, `/audit --fix`, `/audit all`, `/audit --json`

## Diagnostico e Seguranca

### `/debug-error`
- **Capacidades**: Metodologia completa de troubleshooting (reproducao, hipoteses, logs, ferramental).
- **Momento ideal**: Ao investigar erros intermitentes no telegram gateway ou em pipelines cron.
- **Exemplo de momento**: Diagnosticar porque `telegramGateway.js` nao encaminha mensagens em horarios especificos.
- **Tipo de saida**: Passo a passo em texto com hipoteses, investigacoes realizadas e plano de acao final.
- **Exemplos**: `/debug-error "Erro 502 no webhook de sincronia"`, `/debug-error "Worker Kestra travando no start"`

### `/explain-code`
- **Capacidades**: Decompoe e explica blocos de codigo com analise de fluxo e dependencias.
- **Momento ideal**: Quando precisa repassar logica complexa (ex.: hook `useRagQuery`) para outro dev ou documentacao.
- **Exemplo de momento**: Preparar apresentacao do `CollectionFilesTable.tsx` antes de handoff para novo integrante.
- **Tipo de saida**: Analise comentada por secoes/linhas, incluindo descricoes de funcoes e implicacoes de design.
- **Exemplos**: `/explain-code frontend/dashboard/src/hooks/llamaIndex/useRagQuery.ts`, `/explain-code backend/api/telegram-gateway/src/routes/telegramGateway.js`

### `/refactor-code`
- **Capacidades**: Guia refatoracoes seguras, com testes, passos incrementais e metricas.
- **Momento ideal**: Na limpeza de modulos legados (ex.: reorganizar `collectionManager.ts`) garantindo cobertura continua.
- **Exemplo de momento**: Planejar refactor do `documentationService.ts` para reduzir duplicacao de chamadas REST.
- **Tipo de saida**: Plano de refatoracao estruturado com etapas, riscos, testes a rodar e criterios de conclusao.
- **Exemplos**: `/refactor-code tools/rag-services/src/services/collectionManager.ts`, `/refactor-code apps/tp-capital/src/server.js`

## Setup e Padroes

### `/init-project`
- **Capacidades**: Inicializa projetos ou microservicos com estrutura, lint, testes, CI e docs padronizados.
- **Momento ideal**: Ao criar novo submodulo (ex.: ferramenta auxiliar em `tools/`) mantendo consistencia do monorepo.
- **Exemplo de momento**: Preparar boilerplate para um microservico de conciliacao de trades antes de iniciar codigo.
- **Tipo de saida**: Estrutura de pastas e arquivos base gerados, alem de resumo textual das configuracoes aplicadas.
- **Exemplos**: `/init-project api --react`, `/init-project cli --node`

### `/setup-development-environment`
- **Capacidades**: Configura runtimes, IDE, scripts e validacoes para o ambiente do time.
- **Momento ideal**: Quando uma maquina nova precisa replicar o setup oficial (WSL2 + Docker + npm workflows).
- **Exemplo de momento**: Configurar notebook de consultor externo para rodar workflows de health check sem atrito.
- **Tipo de saida**: Lista ordenada de passos de instalacao e validacao, incluindo comandos a executar.
- **Exemplos**: `/setup-development-environment --local`, `/setup-development-environment --docker`, `/setup-development-environment --cloud`, `/setup-development-environment --full-stack`

### `/setup-formatting`
- **Capacidades**: Instala formatadores multi-linguagem, define regras e hooks.
- **Momento ideal**: Ao alinhar padrao de formatacao em times cruzados (frontend + backend) para evitar diffs ruidosos.
- **Exemplo de momento**: Uniformizar estilo de codigo apos integrar contribuicoes do time de dados escrito em Python.
- **Tipo de saida**: Script/configuracao aplicada (ex.: arquivos `.prettierrc`, hooks) e resumo textual do que foi habilitado.
- **Exemplos**: `/setup-formatting --javascript`, `/setup-formatting --typescript`, `/setup-formatting --python`, `/setup-formatting --multi-language`

### `/setup-linting`
- **Capacidades**: Configura linters (ESLint, Flake8 etc.) com regras customizadas.
- **Momento ideal**: Quando expandir suporte a novo stack (ex.: scripts Python) e desejar analise estatica consistente.
- **Exemplo de momento**: Adicionar lint para scripts shell em `scripts/setup/` antes de ampliar automatizacoes.
- **Tipo de saida**: Arquivos de configuracao criados/atualizados e log com comandos para validar a instalacao.
- **Exemplos**: `/setup-linting --javascript`, `/setup-linting --typescript`, `/setup-linting --python`, `/setup-linting --multi-language`

### `/update-dependencies`
- **Capacidades**: Orquestra atualizacao de dependencias com estagios, testes e auditorias.
- **Momento ideal**: Em mutiroes trimestrais de manutencao, reduzindo risco de break change sem supervisao.
- **Exemplo de momento**: Antes de abertura de release, atualizando pacotes do dashboard e reassinando locks.
- **Tipo de saida**: Relatorio sequencial das atualizacoes realizadas, versoes antigas/novas e resultados dos testes.
- **Exemplos**: `/update-dependencies --patch`, `/update-dependencies --minor`, `/update-dependencies --major`, `/update-dependencies --security-only`

## Entrega e DevOps

### `/build`
- **Capacidades**: Executa builds de producao para frontend e APIs, com opcoes de clean, analyze, watch.
- **Momento ideal**: Antes de subir imagens Docker garantindo que o bundle Vite ou build Node esta consistente.
- **Exemplo de momento**: Validar build do dashboard antes de gerar artefatos para deploy nas instancias internas.
- **Tipo de saida**: Logs de build do Vite/Node e, quando solicitado, relatorio de analise de bundle.
- **Exemplos**: `/build`, `/build --clean`, `/build --analyze`, `/build all`, `/build --watch`

### `/commit`
- **Capacidades**: Automatiza commits convencionais com verificacoes de lint/build/docs e mensagens com emoji.
- **Momento ideal**: No fluxo diario, evitando commits fora do padrao `feat/fix/chore` com validacao automatica.
- **Exemplo de momento**: Finalizar ajustes em `useRagQuery.ts` e criar commit bem formatado sem esquecer comandos de validacao.
- **Tipo de saida**: Commit registrado no git com mensagem formatada e feedback textual das verificacoes executadas.
- **Exemplos**: `/commit "feat: adicionar healthcheck tp capital"`, `/commit "fix: corrigir parse de sinais" --no-verify`, `/commit "chore: atualizar deps" --amend`

### `/create-pr`
- **Capacidades**: Cria branch, formata com Biome, divide commits e abre PR com resumo/test plan.
- **Momento ideal**: Ao finalizar atividade e querer acelerar a abertura de PR com convencoes do TradingSystem.
- **Exemplo de momento**: Abrir PR para ajustes no `vite-plugin-preload-hints.ts` com descricao e checagens automatizadas.
- **Tipo de saida**: Branch remoto com commits organizados e descricao de PR pronta para revisao.
- **Exemplos**: `/create-pr --title "feat: melhorar cache da documentacao"`, `/create-pr --title "fix: corrigir webhook telegram" --draft`

### `/setup-ci-cd-pipeline`
- **Capacidades**: Monta pipelines (build, testes, deploy, monitoramento) em plataformas como GitHub Actions.
- **Momento ideal**: Quando um servico ganha deploy autonomo e precisa de fluxo CI/CD completo com seguranca.
- **Exemplo de momento**: Configurar pipeline para publicar o backend `documentation-api` em staging a cada merge.
- **Tipo de saida**: Arquivos de workflow (yaml) e documentacao das etapas automatizadas.
- **Exemplos**: `/setup-ci-cd-pipeline --github-actions`, `/setup-ci-cd-pipeline --gitlab-ci`, `/setup-ci-cd-pipeline --azure-pipelines`, `/setup-ci-cd-pipeline --jenkins`

### `/ci-pipeline`
- **Capacidades**: Administra pipelines CI/CD existentes, gerando workflows padronizados, checando status e propondo correcoes para ambientes multi-stage.
- **Momento ideal**: Quando for necessario garantir estabilidade do GitHub Actions antes de releases ou apos incidentes recorrentes no deploy continuo.
- **Exemplo de momento**: Revisar a pipeline do `tp-capital` depois de expandir testes end-to-end, ajustando matrizes de Node e etapas de seguranca.
- **Tipo de saida**: Playbook com YAML sugerido, comandos de diagnostico (`gh run`, `npm run build`) e checklist de etapas do pipeline.
- **Exemplos**: `/ci-pipeline setup`, `/ci-pipeline status`, `/ci-pipeline fix`, `/ci-pipeline <pipeline-name>`

### `/optimize-build`
- **Capacidades**: Analisa pipeline de build, caching, paralelismo e bundle composition.
- **Momento ideal**: Para reduzir tempos de build do dashboard no CI ou melhorar incremental builds locais.
- **Exemplo de momento**: Ao notar que a pipeline do GitHub Actions passou de 10 minutos, buscando cortes.
- **Tipo de saida**: Relatorio com metricas antes/depois, ajustes sugeridos e comandos de configuracao.
- **Exemplos**: `/optimize-build frontend --analyze`, `/optimize-build backend --profile`

## Infraestrutura e Deploy

### `/containerize-application`
- **Capacidades**: Cria Dockerfiles otimizados, multi-stage e seguros com boas praticas.
- **Momento ideal**: Ao preparar um novo servico (ex.: rag-services) para entrar na stack docker-compose.
- **Exemplo de momento**: Containerizar script de analise para rodar junto aos demais servicos via compose.
- **Tipo de saida**: Dockerfile(s) gerados ou revisados, acompanhados de notas de configuracao e testes de build.
- **Exemplos**: `/containerize-application --node`, `/containerize-application --python`, `/containerize-application --go`, `/containerize-application --multi-stage`

### `/setup-docker-containers`
- **Capacidades**: Define ambientes Docker/Compose (dev, prod, microservices) com volumes e redes.
- **Momento ideal**: Quando integrar servicos adicionais (QuestDB, Kestra) garantindo configuracao alinhada ao ecosistema.
- **Exemplo de momento**: Criar compose dedicado para testes de Kestra integrando Postgres e redis localmente.
- **Tipo de saida**: Arquivos `docker-compose`/scripts atualizados e resumo das redes/volumes definidos.
- **Exemplos**: `/setup-docker-containers --development`, `/setup-docker-containers --production`, `/setup-docker-containers --microservices`, `/setup-docker-containers --compose`

### `/setup-cdn-optimization`
- **Capacidades**: Configura CDN, cache, compressao e hints de carregamento.
- **Momento ideal**: Para melhorar entrega do frontend/documentacao em ambientes externos (ex.: portal docs).
- **Exemplo de momento**: Preparar rollout publico da documentacao, otimizando assets para visitantes externos.
- **Tipo de saida**: Planilha/texto com configuracoes aplicadas (headers, TTLs) e checklist de validacoes de performance.
- **Exemplos**: `/setup-cdn-optimization --cloudflare`, `/setup-cdn-optimization --aws`, `/setup-cdn-optimization --fastly`

## Observabilidade e Performance

### `/add-performance-monitoring`
- **Capacidades**: Implanta APM, tracing, metricas customizadas e alertas para aplicacoes.
- **Momento ideal**: Quando um servico ganha SLAs definidos e precisa de visibilidade (ex.: workspace API).
- **Exemplo de momento**: Habilitar tracing no proxy RAG para diagnosticar latencia em chamadas encadeadas.
- **Tipo de saida**: Plano de integracao com ferramentas (ex.: New Relic, Datadog) contendo dashboards, alertas e endpoints monitorados.
- **Exemplos**: `/add-performance-monitoring --apm`, `/add-performance-monitoring --rum`, `/add-performance-monitoring --custom`

### `/setup-monitoring-observability`
- **Capacidades**: Monta stack completa (metrics, logs, tracing, alerting) integrando Prometheus/Grafana/Sentry.
- **Momento ideal**: Antes de abrir producao para garantir monitoramento de ponta a ponta das execucoes automaticas.
- **Exemplo de momento**: Preparar observabilidade do Kestra + APIs antes de ativar execucoes autonomas em producao.
- **Tipo de saida**: Blueprint de arquitetura de observabilidade, arquivos de configuracao e instrucoes de deploy dos agentes.
- **Exemplos**: `/setup-monitoring-observability --metrics`, `/setup-monitoring-observability --logging`, `/setup-monitoring-observability --tracing`, `/setup-monitoring-observability --full-stack`

### `/implement-caching-strategy`
- **Capacidades**: Desenha estrategia de cache em varias camadas (browser, aplicacao, banco) com politicas de invalidacao.
- **Momento ideal**: Quando consultas repetitivas (ex.: busca hibrida) pressionam a API e exigem plano de cache consistente.
- **Exemplo de momento**: Depois que o dashboard passou a ter busca hibrida pesada, planejando cache distribuido com Redis.
- **Tipo de saida**: Documento com diagrama de camadas de cache, configuracoes recomendadas e plano de invalidacao.
- **Exemplos**: `/implement-caching-strategy --browser`, `/implement-caching-strategy --application`, `/implement-caching-strategy --database`

### `/optimize-api-performance`
- **Capacidades**: Analisa latencia de APIs, caching, gateway, conexoes e throughput.
- **Momento ideal**: Quando relatorios apontam lentidao nas rotas do documentation API ou tp-capital.
- **Exemplo de momento**: Apos detectar picos de 95p > 1s na rota `/api/rag/search`, buscando otimizar a cadeia de chamadas.
- **Tipo de saida**: Relatorio de diagnostico com metricas de resposta, backlog de melhorias e scripts de teste de carga sugeridos.
- **Exemplos**: `/optimize-api-performance --rest`, `/optimize-api-performance --graphql`, `/optimize-api-performance --grpc`

### `/optimize-bundle-size`
- **Capacidades**: Reduz tamanho de bundles com splitting, tree shaking e analise.
- **Momento ideal**: Quando a tela de dashboard excede orcamento de bundle e impacta TTFB/LCP.
- **Exemplo de momento**: Antes de publicar release que adiciona novo modulo React pesado, avaliando impacto de bundle.
- **Tipo de saida**: Comparativo de tamanhos antes/depois, lista de dependencias pesadas e comandos para gerar visualizacoes.
- **Exemplos**: `/optimize-bundle-size --webpack`, `/optimize-bundle-size --vite`, `/optimize-bundle-size --rollup`

### `/optimize-database-performance`
- **Capacidades**: Revisa queries, indices, particionamento e replicas.
- **Momento ideal**: Ao identificar consultas lentas no Timescale/QuestDB durante ingestao em tempo real.
- **Exemplo de momento**: Diagnosticar por que a query que alimenta `STATUS-FINAL-LOGS` passou a levar mais de 2s.
- **Tipo de saida**: Plano de otimizacao com queries analisadas, indices propostos e metricas monitoradas.
- **Exemplos**: `/optimize-database-performance --postgresql`, `/optimize-database-performance --mysql`, `/optimize-database-performance --mongodb`

### `/optimize-memory-usage`
- **Capacidades**: Identifica vazamentos, ajusta garbage collector e sugere padroes de reuso de objetos.
- **Momento ideal**: Quando servicos Node exibem aumento continuo de heap durante execucao prolongada de agentes ou workers.
- **Exemplo de momento**: Investigar crescimento de memoria no `server.ts` depois que consultas RAG foram paralelizadas.
- **Tipo de saida**: Relatorio de perfil de memoria, hipoteses de leak e acoes corretivas recomendadas.
- **Exemplos**: `/optimize-memory-usage --frontend`, `/optimize-memory-usage --backend`, `/optimize-memory-usage --database`

### `/performance-audit`
- **Capacidades**: Consolida metricas de build, rede, banco e aplicacao para detectar gargalos.
- **Momento ideal**: Ao preparar roadmap de melhorias (ex.: auditoria tp-capital) e priorizar onde investir em performance.
- **Exemplo de momento**: Planejar quarter de otimizacao revendo dados reunidos em `03-performance-audit-tp-capital.md`.
- **Tipo de saida**: Documento sintetizando indicadores chave, priorizacao de acoes e links para artefatos de medicao.
- **Exemplos**: `/performance-audit`, `/performance-audit --frontend`, `/performance-audit --backend`, `/performance-audit --full`

## APIs e Dados

### `/doc-api`
- **Capacidades**: Gera documentacao de endpoints, parametros, exemplos e erros.
- **Momento ideal**: Depois de alterar rotas (ex.: rag-proxy) para atualizar referencia consumida por squads internos.
- **Exemplo de momento**: Atualizar docs apos criar rota `/proxy/secure` para garantir onboarding do time de suporte.
- **Tipo de saida**: Documento markdown ou OpenAPI parcial descrevendo endpoints, parametros e exemplos de requests/responses.
- **Exemplos**: `/doc-api --rest documentation-api`, `/doc-api --graphql rag-proxy`, `/doc-api --grpc tp-capital`

### `/generate-api-documentation`
- **Capacidades**: Automatiza geracao de specs e portais (Swagger UI, Redoc, Postman) e integra com CI.
- **Momento ideal**: Ao preparar publicacao da API TP Capital para parceiros ou para disponibilizar colecoes atualizadas.
- **Exemplo de momento**: Antes de compartilhar endpoints do TP Capital com aliados, produzindo portal atual com Swagger UI.
- **Tipo de saida**: Artefatos de documentacao (arquivos OpenAPI, colecoes Postman, paginas HTML) prontos para distribuicao.
- **Exemplos**: `/generate-api-documentation --swagger-ui`, `/generate-api-documentation --redoc`, `/generate-api-documentation --postman`, `/generate-api-documentation --insomnia`, `/generate-api-documentation --multi-format`

## Observacoes Finais

- Comandos com funcoes sobrepostas foram citados em suas secoes principais e referenciados onde se repetem.
- Consulte `.claude/commands/README.md` para fluxos combinados e atalhos adicionais.
- Opcionalmente, execute `/all-tools` no inicio da jornada para validar disponibilidades MCP antes de acionar estes comandos.

## Novos Comandos Automatizados

> ⚠️ Entradas geradas automaticamente a partir dos arquivos Markdown. Revise, ajuste a categoria e complete as descrições conforme necessário.

### `/act`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Execute GitHub Actions locally using act.
- **Momento ideal**: Quando for necessário execute GitHub Actions locally using act.
- **Exemplo de momento**: Ex.: Utilize /act workflow-name durante Act - GitHub Actions Local Execution.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Act - GitHub Actions Local Execution.
- **Exemplos**: /act, /act workflow-name

### `/add-authentication-system`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Implement secure user authentication system with chosen method and security best practices.
- **Momento ideal**: Quando for necessário implement secure user authentication system with chosen method and security best practices.
- **Exemplo de momento**: Ex.: Utilize /add-authentication-system <auth-method> durante Add Authentication System.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Add Authentication System.
- **Exemplos**: /add-authentication-system, /add-authentication-system <auth-method>, /add-authentication-system --oauth, /add-authentication-system --jwt, /add-authentication-system --mfa

### `/add-changelog`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Generate and maintain project changelog with Keep a Changelog format.
- **Momento ideal**: Quando for necessário generate and maintain project changelog with Keep a Changelog format.
- **Exemplo de momento**: Ex.: Utilize /add-changelog <version> durante Add Changelog Entry.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Add Changelog Entry.
- **Exemplos**: /add-changelog, /add-changelog <version>, /add-changelog <entry-type-description>

### `/add-mutation-testing`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Setup comprehensive mutation testing with framework selection and CI integration.
- **Momento ideal**: Quando for necessário setup comprehensive mutation testing with framework selection and CI integration.
- **Exemplo de momento**: Ex.: Utilize /add-mutation-testing <language> durante Add Mutation Testing.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Add Mutation Testing.
- **Exemplos**: /add-mutation-testing, /add-mutation-testing <language>, /add-mutation-testing --javascript, /add-mutation-testing --java, /add-mutation-testing --python

### `/add-package`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Add and configure new package to workspace with proper structure and dependencies.
- **Momento ideal**: Quando for necessário add and configure new package to workspace with proper structure and dependencies.
- **Exemplo de momento**: Ex.: Utilize /add-package <package-name-package-type> durante Add Package to Workspace.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Add Package to Workspace.
- **Exemplos**: /add-package, /add-package <package-name-package-type>, /add-package --library, /add-package --application, /add-package --tool

### `/add-property-based-testing`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Implement property-based testing with framework selection and invariant identification.
- **Momento ideal**: Quando for necessário implement property-based testing with framework selection and invariant identification.
- **Exemplo de momento**: Ex.: Utilize /add-property-based-testing <language> durante Add Property-Based Testing.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Add Property-Based Testing.
- **Exemplos**: /add-property-based-testing, /add-property-based-testing <language>, /add-property-based-testing --javascript, /add-property-based-testing --python, /add-property-based-testing --java

### `/add-to-changelog`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Add entry to project changelog following Keep a Changelog format.
- **Momento ideal**: Quando for necessário add entry to project changelog following Keep a Changelog format.
- **Exemplo de momento**: Ex.: Utilize /add-to-changelog <version-change-type-message> durante Update Changelog.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Update Changelog.
- **Exemplos**: /add-to-changelog, /add-to-changelog <version-change-type-message>, /add-to-changelog --added, /add-to-changelog --changed, /add-to-changelog --fixed

### `/architecture-scenario-explorer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /architecture-scenario-explorer durante Architecture Scenario Explorer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Architecture Scenario Explorer.
- **Exemplos**: /architecture-scenario-explorer

### `/archive`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /archive durante Orchestration Archive Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Archive Command.
- **Exemplos**: /archive

### `/blue-green-deployment`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Implement blue-green deployment strategy with zero-downtime switching, health validation, and automatic rollback.
- **Momento ideal**: Quando for necessário implement blue-green deployment strategy with zero-downtime switching, health validation, and automatic rollback.
- **Exemplo de momento**: Ex.: Utilize /blue-green-deployment <strategy> durante Blue-Green Deployment Strategy.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Blue-Green Deployment Strategy.
- **Exemplos**: /blue-green-deployment, /blue-green-deployment <strategy>, /blue-green-deployment setup, /blue-green-deployment deploy, /blue-green-deployment switch

### `/business-scenario-explorer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Explore multiple business timeline scenarios with comprehensive risk analysis and strategic optimization.
- **Momento ideal**: Quando for necessário explore multiple business timeline scenarios with comprehensive risk analysis and strategic optimization.
- **Exemplo de momento**: Ex.: Utilize /business-scenario-explorer <business-context> durante Business Scenario Explorer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Business Scenario Explorer.
- **Exemplos**: /business-scenario-explorer, /business-scenario-explorer <business-context>, /business-scenario-explorer --market-expansion, /business-scenario-explorer --product-launch, /business-scenario-explorer --funding-scenarios

### `/changelog-demo-command`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Demonstrate changelog automation features with real examples and validation.
- **Momento ideal**: Quando for necessário demonstrate changelog automation features with real examples and validation.
- **Exemplo de momento**: Ex.: Utilize /changelog-demo-command <format> durante Changelog Automation Demo.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Changelog Automation Demo.
- **Exemplos**: /changelog-demo-command, /changelog-demo-command <format>, /changelog-demo-command --generate, /changelog-demo-command --validate, /changelog-demo-command --demo

### `/check-file`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /check-file durante File Analysis Tool.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para File Analysis Tool.
- **Exemplos**: /check-file

### `/ci-setup`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Setup comprehensive CI/CD pipeline with automated testing, building, and deployment.
- **Momento ideal**: Quando for necessário setup comprehensive CI/CD pipeline with automated testing, building, and deployment.
- **Exemplo de momento**: Ex.: Utilize /ci-setup <platform> durante CI/CD Pipeline Setup.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para CI/CD Pipeline Setup.
- **Exemplos**: /ci-setup, /ci-setup <platform>, /ci-setup --github-actions, /ci-setup --gitlab-ci, /ci-setup --jenkins

### `/clean`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /clean durante o comando /clean.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para o comando /clean.
- **Exemplos**: /clean

### `/clean-branches`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /clean-branches durante Clean Branches Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Clean Branches Command.
- **Exemplos**: /clean-branches

### `/code-permutation-tester`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /code-permutation-tester durante Code Permutation Tester.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Code Permutation Tester.
- **Exemplos**: /code-permutation-tester

### `/code-to-task`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /code-to-task durante Convert Code Analysis to Linear Tasks.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Convert Code Analysis to Linear Tasks.
- **Exemplos**: /code-to-task

### `/constraint-modeler`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Model system constraints with validation, dependency mapping, and optimization strategies.
- **Momento ideal**: Quando for necessário model system constraints with validation, dependency mapping, and optimization strategies.
- **Exemplo de momento**: Ex.: Utilize /constraint-modeler <constraint-domain> durante Constraint Modeler.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Constraint Modeler.
- **Exemplos**: /constraint-modeler, /constraint-modeler <constraint-domain>, /constraint-modeler --business, /constraint-modeler --technical, /constraint-modeler --regulatory

### `/context-prime`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /context-prime durante o comando /context-prime.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para o comando /context-prime.
- **Exemplos**: /context-prime

### `/create-jtbd`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create Jobs-to-be-Done (JTBD) analysis for product features.
- **Momento ideal**: Quando for necessário create Jobs-to-be-Done (JTBD) analysis for product features.
- **Exemplo de momento**: Ex.: Utilize /create-jtbd <feature-name> durante Create Jobs-to-be-Done Document.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Create Jobs-to-be-Done Document.
- **Exemplos**: /create-jtbd, /create-jtbd <feature-name>, /create-jtbd --template, /create-jtbd --interactive

### `/create-prd`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create Product Requirements Document (PRD) for new features.
- **Momento ideal**: Quando for necessário create Product Requirements Document (PRD) for new features.
- **Exemplo de momento**: Ex.: Utilize /create-prd <feature-name> durante Create Product Requirements Document.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Create Product Requirements Document.
- **Exemplos**: /create-prd, /create-prd <feature-name>, /create-prd --template, /create-prd --interactive

### `/create-prp`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create comprehensive Product Requirement Prompt (PRP) with research and validation.
- **Momento ideal**: Quando for necessário create comprehensive Product Requirement Prompt (PRP) with research and validation.
- **Exemplo de momento**: Ex.: Utilize /create-prp <feature-description> durante Create Product Requirement Prompt.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Create Product Requirement Prompt.
- **Exemplos**: /create-prp, /create-prp <feature-description>, /create-prp --research, /create-prp --template, /create-prp --validate

### `/decision-quality-analyzer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze team decision quality with bias detection, scenario testing, and process improvement recommendations.
- **Momento ideal**: Quando for necessário analyze team decision quality with bias detection, scenario testing, and process improvement recommendations.
- **Exemplo de momento**: Ex.: Utilize /decision-quality-analyzer <analysis-type> durante Decision Quality Analyzer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Decision Quality Analyzer.
- **Exemplos**: /decision-quality-analyzer, /decision-quality-analyzer <analysis-type>, /decision-quality-analyzer --bias-detection, /decision-quality-analyzer --scenario-testing, /decision-quality-analyzer --process-optimization

### `/decision-tree-explorer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Explore complex decision branches with probability analysis, expected value calculation, and optimization.
- **Momento ideal**: Quando for necessário explore complex decision branches with probability analysis, expected value calculation, and optimization.
- **Exemplo de momento**: Ex.: Utilize /decision-tree-explorer <decision-context> durante Decision Tree Explorer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Decision Tree Explorer.
- **Exemplos**: /decision-tree-explorer, /decision-tree-explorer <decision-context>, /decision-tree-explorer --strategic, /decision-tree-explorer --investment, /decision-tree-explorer --operational

### `/dependency-audit`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Audit dependencies for security vulnerabilities, license compliance, and update recommendations.
- **Momento ideal**: Quando for necessário audit dependencies for security vulnerabilities, license compliance, and update recommendations.
- **Exemplo de momento**: Ex.: Utilize /dependency-audit <scope> durante Dependency Audit.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Dependency Audit.
- **Exemplos**: /dependency-audit, /dependency-audit <scope>, /dependency-audit --security, /dependency-audit --licenses, /dependency-audit --updates

### `/dependency-mapper`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Map project and task dependencies with critical path analysis and circular dependency detection.
- **Momento ideal**: Quando for necessário map project and task dependencies with critical path analysis and circular dependency detection.
- **Exemplo de momento**: Ex.: Utilize /dependency-mapper <scope> durante Dependency Mapper.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Dependency Mapper.
- **Exemplos**: /dependency-mapper, /dependency-mapper <scope>, /dependency-mapper --tasks, /dependency-mapper --code, /dependency-mapper --circular

### `/deployment-monitoring`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Comprehensive deployment monitoring with observability, alerting, health checks, and performance tracking.
- **Momento ideal**: Quando for necessário comprehensive deployment monitoring with observability, alerting, health checks, and performance tracking.
- **Exemplo de momento**: Ex.: Utilize /deployment-monitoring <monitoring-type> durante Deployment Monitoring & Observability.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Deployment Monitoring & Observability.
- **Exemplos**: /deployment-monitoring, /deployment-monitoring <monitoring-type>, /deployment-monitoring setup, /deployment-monitoring dashboard, /deployment-monitoring alerts

### `/digital-twin-creator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create calibrated digital twins with real-world validation, scenario testing, and decision optimization.
- **Momento ideal**: Quando for necessário create calibrated digital twins with real-world validation, scenario testing, and decision optimization.
- **Exemplo de momento**: Ex.: Utilize /digital-twin-creator <twin-subject> durante Digital Twin Creator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Digital Twin Creator.
- **Exemplos**: /digital-twin-creator, /digital-twin-creator <twin-subject>, /digital-twin-creator --manufacturing, /digital-twin-creator --business-process, /digital-twin-creator --customer-journey

### `/directory-deep-dive`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /directory-deep-dive durante Directory Deep Dive.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Directory Deep Dive.
- **Exemplos**: /directory-deep-dive

### `/e2e-setup`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Configure comprehensive end-to-end testing suite with framework selection and CI integration.
- **Momento ideal**: Quando for necessário configure comprehensive end-to-end testing suite with framework selection and CI integration.
- **Exemplo de momento**: Ex.: Utilize /e2e-setup <framework> durante E2E Setup.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para E2E Setup.
- **Exemplos**: /e2e-setup, /e2e-setup <framework>, /e2e-setup --cypress, /e2e-setup --playwright, /e2e-setup --webdriver

### `/estimate-assistant`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Generate accurate task estimates using historical data, complexity analysis, and team velocity metrics.
- **Momento ideal**: Quando for necessário generate accurate task estimates using historical data, complexity analysis, and team velocity metrics.
- **Exemplo de momento**: Ex.: Utilize /estimate-assistant <task-description> durante Estimate Assistant.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Estimate Assistant.
- **Exemplos**: /estimate-assistant, /estimate-assistant <task-description>, /estimate-assistant --historical, /estimate-assistant --complexity-analysis, /estimate-assistant --team-velocity

### `/fix-issue`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /fix-issue durante Fix Issue Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Fix Issue Command.
- **Exemplos**: /fix-issue

### `/future-scenario-generator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Generate comprehensive future scenarios with plausibility scoring, trend integration, and strategic implications.
- **Momento ideal**: Quando for necessário generate comprehensive future scenarios with plausibility scoring, trend integration, and strategic implications.
- **Exemplo de momento**: Ex.: Utilize /future-scenario-generator <time-horizon> durante Future Scenario Generator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Future Scenario Generator.
- **Exemplos**: /future-scenario-generator, /future-scenario-generator <time-horizon>, /future-scenario-generator --near-term, /future-scenario-generator --medium-term, /future-scenario-generator --long-term

### `/generate-linear-worklog`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /generate-linear-worklog durante Generate Linear Work Log.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Generate Linear Work Log.
- **Exemplos**: /generate-linear-worklog

### `/generate-test-cases`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Generate comprehensive test cases with automatic analysis and coverage optimization.
- **Momento ideal**: Quando for necessário generate comprehensive test cases with automatic analysis and coverage optimization.
- **Exemplo de momento**: Ex.: Utilize /generate-test-cases <target> durante Generate Test Cases.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Generate Test Cases.
- **Exemplos**: /generate-test-cases, /generate-test-cases <target>, /generate-test-cases <scope>, /generate-test-cases --unit, /generate-test-cases --integration

### `/git-status`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /git-status durante Git Status Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Git Status Command.
- **Exemplos**: /git-status

### `/hotfix-deploy`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Deploy critical hotfixes with emergency procedures, validation, and rollback capabilities.
- **Momento ideal**: Quando for necessário deploy critical hotfixes with emergency procedures, validation, and rollback capabilities.
- **Exemplo de momento**: Ex.: Utilize /hotfix-deploy <hotfix-type> durante Emergency Hotfix Deployment.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Emergency Hotfix Deployment.
- **Exemplos**: /hotfix-deploy, /hotfix-deploy <hotfix-type>, /hotfix-deploy --security, /hotfix-deploy --critical, /hotfix-deploy --rollback-ready

### `/husky`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Run comprehensive CI checks and fix issues until repository is in working state.
- **Momento ideal**: Quando for necessário run comprehensive CI checks and fix issues until repository is in working state.
- **Exemplo de momento**: Ex.: Utilize /husky <--skip-install> durante Husky CI Pre-commit Checks.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Husky CI Pre-commit Checks.
- **Exemplos**: /husky, /husky <--skip-install>, /husky <--only-lint>, /husky <--skip-tests>

### `/implement-graphql-api`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Implement GraphQL API with comprehensive schema, resolvers, and real-time subscriptions.
- **Momento ideal**: Quando for necessário implement GraphQL API with comprehensive schema, resolvers, and real-time subscriptions.
- **Exemplo de momento**: Ex.: Utilize /implement-graphql-api <schema-approach> durante Implement GraphQL API.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Implement GraphQL API.
- **Exemplos**: /implement-graphql-api, /implement-graphql-api <schema-approach>, /implement-graphql-api --schema-first, /implement-graphql-api --code-first, /implement-graphql-api --federation

### `/initref`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /initref durante o comando /initref.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para o comando /initref.
- **Exemplos**: /initref

### `/interactive-documentation`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Use PROACTIVELY to create interactive documentation platforms with live examples, code playgrounds, and user engagement features.
- **Momento ideal**: Quando for necessário use PROACTIVELY to create interactive documentation platforms with live examples, code playgrounds, and user engagement features.
- **Exemplo de momento**: Ex.: Utilize /interactive-documentation <platform> durante Interactive Documentation Platform.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Interactive Documentation Platform.
- **Exemplos**: /interactive-documentation, /interactive-documentation <platform>, /interactive-documentation --docusaurus, /interactive-documentation --gitbook, /interactive-documentation --notion

### `/issue-triage`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Intelligent issue triage with automatic categorization, prioritization, and team assignment.
- **Momento ideal**: Quando for necessário intelligent issue triage with automatic categorization, prioritization, and team assignment.
- **Exemplo de momento**: Ex.: Utilize /issue-triage <scope> durante Issue Triage.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Issue Triage.
- **Exemplos**: /issue-triage, /issue-triage <scope>, /issue-triage --github-issues, /issue-triage --linear-tasks, /issue-triage --priority-analysis

### `/load-llms-txt`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Load and process external documentation context from llms.txt files or custom sources.
- **Momento ideal**: Quando for necessário load and process external documentation context from llms.txt files or custom sources.
- **Exemplo de momento**: Ex.: Utilize /load-llms-txt <data-source> durante External Documentation Context Loader.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para External Documentation Context Loader.
- **Exemplos**: /load-llms-txt, /load-llms-txt <data-source>, /load-llms-txt --xatu, /load-llms-txt --custom-url, /load-llms-txt --validate

### `/log`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /log durante Orchestration Log Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Log Command.
- **Exemplos**: /log

### `/market-response-modeler`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Model comprehensive market and customer responses with segment analysis, behavioral prediction, and optimization.
- **Momento ideal**: Quando for necessário model comprehensive market and customer responses with segment analysis, behavioral prediction, and optimization.
- **Exemplo de momento**: Ex.: Utilize /market-response-modeler <market-trigger> durante Market Response Modeler.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Market Response Modeler.
- **Exemplos**: /market-response-modeler, /market-response-modeler <market-trigger>, /market-response-modeler --product-launch, /market-response-modeler --pricing-change, /market-response-modeler --marketing-campaign

### `/memory-spring-cleaning`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Clean and organize project memory files with implementation synchronization and pattern updates.
- **Momento ideal**: Quando for necessário clean and organize project memory files with implementation synchronization and pattern updates.
- **Exemplo de momento**: Ex.: Utilize /memory-spring-cleaning <scope> durante Memory Spring Cleaning.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Memory Spring Cleaning.
- **Exemplos**: /memory-spring-cleaning, /memory-spring-cleaning <scope>, /memory-spring-cleaning --claude-md, /memory-spring-cleaning --documentation, /memory-spring-cleaning --outdated-patterns

### `/migrate-to-typescript`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Migrate JavaScript project to TypeScript with proper typing and tooling setup.
- **Momento ideal**: Quando for necessário migrate JavaScript project to TypeScript with proper typing and tooling setup.
- **Exemplo de momento**: Ex.: Utilize /migrate-to-typescript <migration-strategy> durante Migrate to TypeScript.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Migrate to TypeScript.
- **Exemplos**: /migrate-to-typescript, /migrate-to-typescript <migration-strategy>, /migrate-to-typescript --gradual, /migrate-to-typescript --complete, /migrate-to-typescript --strict

### `/migration-assistant`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Comprehensive system migration assistance with planning, analysis, execution, and rollback capabilities.
- **Momento ideal**: Quando for necessário comprehensive system migration assistance with planning, analysis, execution, and rollback capabilities.
- **Exemplo de momento**: Ex.: Utilize /migration-assistant <action> durante Migration Assistant.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Migration Assistant.
- **Exemplos**: /migration-assistant, /migration-assistant <action>, /migration-assistant --plan, /migration-assistant --analyze, /migration-assistant --migrate

### `/migration-guide`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create comprehensive migration guides with step-by-step procedures, validation, and rollback strategies.
- **Momento ideal**: Quando for necessário create comprehensive migration guides with step-by-step procedures, validation, and rollback strategies.
- **Exemplo de momento**: Ex.: Utilize /migration-guide <migration-type> durante Migration Guide Generator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Migration Guide Generator.
- **Exemplos**: /migration-guide, /migration-guide <migration-type>, /migration-guide framework, /migration-guide database, /migration-guide cloud

### `/milestone-tracker`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Track and analyze project milestone progress with predictive analytics.
- **Momento ideal**: Quando for necessário track and analyze project milestone progress with predictive analytics.
- **Exemplo de momento**: Ex.: Utilize /milestone-tracker <time-period> durante Milestone Tracker.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Milestone Tracker.
- **Exemplos**: /milestone-tracker, /milestone-tracker <time-period>, /milestone-tracker --sprint, /milestone-tracker --quarter, /milestone-tracker --all

### `/monte-carlo-simulator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Run Monte Carlo simulations with probability distributions, confidence intervals, and statistical analysis.
- **Momento ideal**: Quando for necessário run Monte Carlo simulations with probability distributions, confidence intervals, and statistical analysis.
- **Exemplo de momento**: Ex.: Utilize /monte-carlo-simulator <simulation-target> durante Monte Carlo Simulator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Monte Carlo Simulator.
- **Exemplos**: /monte-carlo-simulator, /monte-carlo-simulator <simulation-target>, /monte-carlo-simulator --financial-projections, /monte-carlo-simulator --project-timelines, /monte-carlo-simulator --market-scenarios

### `/move`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /move durante Task Move Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Task Move Command.
- **Exemplos**: /move

### `/optimize`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /optimize durante Orchestration Optimize Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Optimize Command.
- **Exemplos**: /optimize

### `/pac-configure`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Initialize Product as Code (PAC) project structure with templates and configuration.
- **Momento ideal**: Quando for necessário initialize Product as Code (PAC) project structure with templates and configuration.
- **Exemplo de momento**: Ex.: Utilize /pac-configure <project-name> durante Configure PAC Project.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Configure PAC Project.
- **Exemplos**: /pac-configure, /pac-configure <project-name>, /pac-configure --minimal, /pac-configure --epic-name, /pac-configure --owner

### `/pac-create-epic`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create new PAC epic following Product as Code specification.
- **Momento ideal**: Quando for necessário create new PAC epic following Product as Code specification.
- **Exemplo de momento**: Ex.: Utilize /pac-create-epic <epic-name> durante Create PAC Epic.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Create PAC Epic.
- **Exemplos**: /pac-create-epic, /pac-create-epic <epic-name>, /pac-create-epic --name, /pac-create-epic --description, /pac-create-epic --owner

### `/pac-create-ticket`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Create new PAC ticket within an epic following Product as Code specification.
- **Momento ideal**: Quando for necessário create new PAC ticket within an epic following Product as Code specification.
- **Exemplo de momento**: Ex.: Utilize /pac-create-ticket <ticket-name> durante Create PAC Ticket.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Create PAC Ticket.
- **Exemplos**: /pac-create-ticket, /pac-create-ticket <ticket-name>, /pac-create-ticket --epic, /pac-create-ticket --type, /pac-create-ticket --assignee

### `/pac-update-status`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Update PAC ticket status and track progress in Product as Code workflow.
- **Momento ideal**: Quando for necessário update PAC ticket status and track progress in Product as Code workflow.
- **Exemplo de momento**: Ex.: Utilize /pac-update-status <ticket-id> durante Update PAC Ticket Status.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Update PAC Ticket Status.
- **Exemplos**: /pac-update-status, /pac-update-status <ticket-id>, /pac-update-status --status, /pac-update-status --assignee, /pac-update-status --comment

### `/pac-validate`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Validate Product as Code project structure and files for PAC specification compliance.
- **Momento ideal**: Quando for necessário validate Product as Code project structure and files for PAC specification compliance.
- **Exemplo de momento**: Ex.: Utilize /pac-validate <scope> durante Validate PAC Structure.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Validate PAC Structure.
- **Exemplos**: /pac-validate, /pac-validate <scope>, /pac-validate --file, /pac-validate --epic, /pac-validate --fix

### `/penetration-test`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Perform penetration testing and vulnerability assessment on application.
- **Momento ideal**: Quando for necessário perform penetration testing and vulnerability assessment on application.
- **Exemplo de momento**: Ex.: Utilize /penetration-test <target> durante Penetration Test.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Penetration Test.
- **Exemplos**: /penetration-test, /penetration-test <target>, /penetration-test --web-app, /penetration-test --api, /penetration-test --auth

### `/prepare-release`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Prepare and validate release packages with comprehensive testing, documentation, and automation.
- **Momento ideal**: Quando for necessário prepare and validate release packages with comprehensive testing, documentation, and automation.
- **Exemplo de momento**: Ex.: Utilize /prepare-release <version-type> durante Release Preparation.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Release Preparation.
- **Exemplos**: /prepare-release, /prepare-release <version-type>, /prepare-release patch, /prepare-release minor, /prepare-release major

### `/prime`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /prime durante Enhanced AI Mode for Complex Tasks.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Enhanced AI Mode for Complex Tasks.
- **Exemplos**: /prime

### `/project-health-check`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze overall project health and generate comprehensive metrics report.
- **Momento ideal**: Quando for necessário analyze overall project health and generate comprehensive metrics report.
- **Exemplo de momento**: Ex.: Utilize /project-health-check <evaluation-period> durante Project Health Check.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Project Health Check.
- **Exemplos**: /project-health-check, /project-health-check <evaluation-period>, /project-health-check --30-days, /project-health-check --sprint, /project-health-check --quarter

### `/project-timeline-simulator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Simulate project outcomes with variable modeling, risk assessment, and resource optimization.
- **Momento ideal**: Quando for necessário simulate project outcomes with variable modeling, risk assessment, and resource optimization.
- **Exemplo de momento**: Ex.: Utilize /project-timeline-simulator <project-type> durante Project Timeline Simulator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Project Timeline Simulator.
- **Exemplos**: /project-timeline-simulator, /project-timeline-simulator <project-type>, /project-timeline-simulator --duration, /project-timeline-simulator --team-size, /project-timeline-simulator --risk-level

### `/project-to-linear`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Sync project structure and requirements to Linear workspace with comprehensive task breakdown.
- **Momento ideal**: Quando for necessário sync project structure and requirements to Linear workspace with comprehensive task breakdown.
- **Exemplo de momento**: Ex.: Utilize /project-to-linear <project-description> durante Project to Linear.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Project to Linear.
- **Exemplos**: /project-to-linear, /project-to-linear <project-description>, /project-to-linear --team-id, /project-to-linear --create-new, /project-to-linear --epic-name

### `/release`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Prepare and execute project release with version management and changelog updates.
- **Momento ideal**: Quando for necessário prepare and execute project release with version management and changelog updates.
- **Exemplo de momento**: Ex.: Utilize /release <version-type> durante Project Release.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Project Release.
- **Exemplos**: /release, /release <version-type>, /release --patch, /release --minor, /release --major

### `/remove`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /remove durante Orchestration Remove Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Remove Command.
- **Exemplos**: /remove

### `/report`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /report durante Task Report Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Task Report Command.
- **Exemplos**: /report

### `/resume`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /resume durante Orchestration Resume Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Resume Command.
- **Exemplos**: /resume

### `/retrospective-analyzer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze team retrospectives with quantitative metrics and actionable insights generation.
- **Momento ideal**: Quando for necessário analyze team retrospectives with quantitative metrics and actionable insights generation.
- **Exemplo de momento**: Ex.: Utilize /retrospective-analyzer <sprint-identifier> durante Retrospective Analyzer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Retrospective Analyzer.
- **Exemplos**: /retrospective-analyzer, /retrospective-analyzer <sprint-identifier>, /retrospective-analyzer --metrics, /retrospective-analyzer --insights, /retrospective-analyzer --action-items

### `/rollback-deploy`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Rollback deployment to previous version with safety checks, database considerations, and monitoring.
- **Momento ideal**: Quando for necessário rollback deployment to previous version with safety checks, database considerations, and monitoring.
- **Exemplo de momento**: Ex.: Utilize /rollback-deploy <target-version> durante Deployment Rollback.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Deployment Rollback.
- **Exemplos**: /rollback-deploy, /rollback-deploy <target-version>, /rollback-deploy --previous, /rollback-deploy --emergency, /rollback-deploy --validate-first

### `/secrets-scanner`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Scan codebase for exposed secrets, credentials, and sensitive information.
- **Momento ideal**: Quando for necessário scan codebase for exposed secrets, credentials, and sensitive information.
- **Exemplo de momento**: Ex.: Utilize /secrets-scanner <scope> durante Secrets Scanner.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Secrets Scanner.
- **Exemplos**: /secrets-scanner, /secrets-scanner <scope>, /secrets-scanner --api-keys, /secrets-scanner --passwords, /secrets-scanner --certificates

### `/security-audit`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Perform comprehensive security assessment and vulnerability analysis.
- **Momento ideal**: Quando for necessário perform comprehensive security assessment and vulnerability analysis.
- **Exemplo de momento**: Ex.: Utilize /security-audit <focus-area> durante Security Audit.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Security Audit.
- **Exemplos**: /security-audit, /security-audit <focus-area>, /security-audit --full

### `/security-hardening`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Harden application security configuration with comprehensive security controls.
- **Momento ideal**: Quando for necessário harden application security configuration with comprehensive security controls.
- **Exemplo de momento**: Ex.: Utilize /security-hardening <focus-area> durante Security Hardening.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Security Hardening.
- **Exemplos**: /security-hardening, /security-hardening <focus-area>, /security-hardening --headers, /security-hardening --auth, /security-hardening --encryption

### `/session-learning-capture`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Capture and document session learnings with automatic knowledge integration and memory updates.
- **Momento ideal**: Quando for necessário capture and document session learnings with automatic knowledge integration and memory updates.
- **Exemplo de momento**: Ex.: Utilize /session-learning-capture <capture-type> durante Session Learning Capture.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Session Learning Capture.
- **Exemplos**: /session-learning-capture, /session-learning-capture <capture-type>, /session-learning-capture --project-learnings, /session-learning-capture --implementation-corrections, /session-learning-capture --structure-insights

### `/setup-automated-releases`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Setup automated release workflows with semantic versioning, conventional commits, and comprehensive automation.
- **Momento ideal**: Quando for necessário setup automated release workflows with semantic versioning, conventional commits, and comprehensive automation.
- **Exemplo de momento**: Ex.: Utilize /setup-automated-releases <release-type> durante Automated Release System.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Automated Release System.
- **Exemplos**: /setup-automated-releases, /setup-automated-releases <release-type>, /setup-automated-releases --semantic, /setup-automated-releases --conventional-commits, /setup-automated-releases --github-actions

### `/setup-comprehensive-testing`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Setup complete testing infrastructure with framework configuration and CI integration.
- **Momento ideal**: Quando for necessário setup complete testing infrastructure with framework configuration and CI integration.
- **Exemplo de momento**: Ex.: Utilize /setup-comprehensive-testing <scope> durante Setup Comprehensive Testing.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Setup Comprehensive Testing.
- **Exemplos**: /setup-comprehensive-testing, /setup-comprehensive-testing <scope>, /setup-comprehensive-testing --unit, /setup-comprehensive-testing --integration, /setup-comprehensive-testing --e2e

### `/setup-kubernetes-deployment`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Configure comprehensive Kubernetes deployment with manifests, security, scaling, and production best practices.
- **Momento ideal**: Quando for necessário configure comprehensive Kubernetes deployment with manifests, security, scaling, and production best practices.
- **Exemplo de momento**: Ex.: Utilize /setup-kubernetes-deployment <deployment-type> durante Kubernetes Deployment Configuration.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Kubernetes Deployment Configuration.
- **Exemplos**: /setup-kubernetes-deployment, /setup-kubernetes-deployment <deployment-type>, /setup-kubernetes-deployment --microservices, /setup-kubernetes-deployment --monolith, /setup-kubernetes-deployment --stateful

### `/setup-load-testing`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Configure comprehensive load testing with performance metrics and bottleneck identification.
- **Momento ideal**: Quando for necessário configure comprehensive load testing with performance metrics and bottleneck identification.
- **Exemplo de momento**: Ex.: Utilize /setup-load-testing <testing-type> durante Setup Load Testing.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Setup Load Testing.
- **Exemplos**: /setup-load-testing, /setup-load-testing <testing-type>, /setup-load-testing --capacity, /setup-load-testing --stress, /setup-load-testing --spike

### `/setup-monorepo`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Configure monorepo project structure with comprehensive workspace management and build orchestration.
- **Momento ideal**: Quando for necessário configure monorepo project structure with comprehensive workspace management and build orchestration.
- **Exemplo de momento**: Ex.: Utilize /setup-monorepo <monorepo-tool> durante Setup Monorepo.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Setup Monorepo.
- **Exemplos**: /setup-monorepo, /setup-monorepo <monorepo-tool>, /setup-monorepo --nx, /setup-monorepo --lerna, /setup-monorepo --rush

### `/setup-rate-limiting`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Implement comprehensive API rate limiting with advanced algorithms and user-specific policies.
- **Momento ideal**: Quando for necessário implement comprehensive API rate limiting with advanced algorithms and user-specific policies.
- **Exemplo de momento**: Ex.: Utilize /setup-rate-limiting <rate-limit-type> durante Setup Rate Limiting.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Setup Rate Limiting.
- **Exemplos**: /setup-rate-limiting, /setup-rate-limiting <rate-limit-type>, /setup-rate-limiting --api, /setup-rate-limiting --authentication, /setup-rate-limiting --file-upload

### `/setup-visual-testing`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Setup comprehensive visual regression testing with cross-browser and responsive testing.
- **Momento ideal**: Quando for necessário setup comprehensive visual regression testing with cross-browser and responsive testing.
- **Exemplo de momento**: Ex.: Utilize /setup-visual-testing <testing-scope> durante Setup Visual Testing.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Setup Visual Testing.
- **Exemplos**: /setup-visual-testing, /setup-visual-testing <testing-scope>, /setup-visual-testing --components, /setup-visual-testing --pages, /setup-visual-testing --responsive

### `/simulation-calibrator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Calibrate simulation accuracy with systematic validation, bias detection, and continuous improvement.
- **Momento ideal**: Quando for necessário calibrate simulation accuracy with systematic validation, bias detection, and continuous improvement.
- **Exemplo de momento**: Ex.: Utilize /simulation-calibrator <simulation-type> durante Simulation Calibrator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Simulation Calibrator.
- **Exemplos**: /simulation-calibrator, /simulation-calibrator <simulation-type>, /simulation-calibrator --business, /simulation-calibrator --technical, /simulation-calibrator --behavioral

### `/sprint-planning`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Plan and organize sprint workflows with Linear integration and capacity analysis.
- **Momento ideal**: Quando for necessário plan and organize sprint workflows with Linear integration and capacity analysis.
- **Exemplo de momento**: Ex.: Utilize /sprint-planning <sprint-duration> durante Sprint Planning.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Sprint Planning.
- **Exemplos**: /sprint-planning, /sprint-planning <sprint-duration>, /sprint-planning <start-date-duration>

### `/standup-report`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Generate comprehensive daily standup reports with team activity analysis and progress tracking.
- **Momento ideal**: Quando for necessário generate comprehensive daily standup reports with team activity analysis and progress tracking.
- **Exemplo de momento**: Ex.: Utilize /standup-report <time-range> durante Standup Report.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Standup Report.
- **Exemplos**: /standup-report, /standup-report <time-range>, /standup-report --yesterday, /standup-report --last-24h, /standup-report --since-friday

### `/status`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /status durante Task Status Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Task Status Command.
- **Exemplos**: /status

### `/sync`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Descrição automática pendente de revisão.
- **Momento ideal**: Definir o melhor momento de uso do comando.
- **Exemplo de momento**: Ex.: Execute /sync durante Orchestration Sync Command.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Orchestration Sync Command.
- **Exemplos**: /sync

### `/system-dynamics-modeler`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Model complex system dynamics with feedback loops, delays, and emergent behavior analysis.
- **Momento ideal**: Quando for necessário model complex system dynamics with feedback loops, delays, and emergent behavior analysis.
- **Exemplo de momento**: Ex.: Utilize /system-dynamics-modeler <system-type> durante System Dynamics Modeler.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para System Dynamics Modeler.
- **Exemplos**: /system-dynamics-modeler, /system-dynamics-modeler <system-type>, /system-dynamics-modeler --business-ecosystem, /system-dynamics-modeler --organizational-dynamics, /system-dynamics-modeler --market-evolution

### `/team-knowledge-mapper`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Map team knowledge and expertise with skill gap analysis and learning path recommendations.
- **Momento ideal**: Quando for necessário map team knowledge and expertise with skill gap analysis and learning path recommendations.
- **Exemplo de momento**: Ex.: Utilize /team-knowledge-mapper <mapping-type> durante Team Knowledge Mapper.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Team Knowledge Mapper.
- **Exemplos**: /team-knowledge-mapper, /team-knowledge-mapper <mapping-type>, /team-knowledge-mapper --skill-matrix, /team-knowledge-mapper --knowledge-gaps, /team-knowledge-mapper --expertise-areas

### `/team-velocity-tracker`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Track and analyze team velocity with predictive forecasting and performance optimization recommendations.
- **Momento ideal**: Quando for necessário track and analyze team velocity with predictive forecasting and performance optimization recommendations.
- **Exemplo de momento**: Ex.: Utilize /team-velocity-tracker <analysis-period> durante Team Velocity Tracker.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Team Velocity Tracker.
- **Exemplos**: /team-velocity-tracker, /team-velocity-tracker <analysis-period>, /team-velocity-tracker --sprint, /team-velocity-tracker --monthly, /team-velocity-tracker --quarterly

### `/team-workload-balancer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze and optimize team workload distribution with skill matching and capacity planning.
- **Momento ideal**: Quando for necessário analyze and optimize team workload distribution with skill matching and capacity planning.
- **Exemplo de momento**: Ex.: Utilize /team-workload-balancer <analysis-type> durante Team Workload Balancer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Team Workload Balancer.
- **Exemplos**: /team-workload-balancer, /team-workload-balancer <analysis-type>, /team-workload-balancer --current-workload, /team-workload-balancer --skill-matching, /team-workload-balancer --capacity-planning

### `/test-automation-orchestrator`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Orchestrate comprehensive test automation with intelligent execution and optimization.
- **Momento ideal**: Quando for necessário orchestrate comprehensive test automation with intelligent execution and optimization.
- **Exemplo de momento**: Ex.: Utilize /test-automation-orchestrator <orchestration-type> durante Test Automation Orchestrator.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Test Automation Orchestrator.
- **Exemplos**: /test-automation-orchestrator, /test-automation-orchestrator <orchestration-type>, /test-automation-orchestrator --parallel, /test-automation-orchestrator --sequential, /test-automation-orchestrator --conditional

### `/test-changelog-automation`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Automate changelog testing workflow with CI integration and validation.
- **Momento ideal**: Quando for necessário automate changelog testing workflow with CI integration and validation.
- **Exemplo de momento**: Ex.: Utilize /test-changelog-automation <automation-type> durante Test Changelog Automation.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Test Changelog Automation.
- **Exemplos**: /test-changelog-automation, /test-changelog-automation <automation-type>, /test-changelog-automation --changelog, /test-changelog-automation --workflow-demo, /test-changelog-automation --ci-integration

### `/test-coverage`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze and improve test coverage with comprehensive reporting and gap identification.
- **Momento ideal**: Quando for necessário analyze and improve test coverage with comprehensive reporting and gap identification.
- **Exemplo de momento**: Ex.: Utilize /test-coverage <coverage-type> durante Test Coverage.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Test Coverage.
- **Exemplos**: /test-coverage, /test-coverage <coverage-type>, /test-coverage --line, /test-coverage --branch, /test-coverage --function

### `/test-quality-analyzer`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Analyze test suite quality with comprehensive metrics and improvement recommendations.
- **Momento ideal**: Quando for necessário analyze test suite quality with comprehensive metrics and improvement recommendations.
- **Exemplo de momento**: Ex.: Utilize /test-quality-analyzer <analysis-type> durante Test Quality Analyzer.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Test Quality Analyzer.
- **Exemplos**: /test-quality-analyzer, /test-quality-analyzer <analysis-type>, /test-quality-analyzer --coverage-quality, /test-quality-analyzer --test-effectiveness, /test-quality-analyzer --maintainability

### `/timeline-compressor`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Compress real-world timelines into rapid simulation cycles with accelerated learning and decision optimization.
- **Momento ideal**: Quando for necessário compress real-world timelines into rapid simulation cycles with accelerated learning and decision optimization.
- **Exemplo de momento**: Ex.: Utilize /timeline-compressor <timeline-type> durante Timeline Compressor.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Timeline Compressor.
- **Exemplos**: /timeline-compressor, /timeline-compressor <timeline-type>, /timeline-compressor --product-development, /timeline-compressor --market-adoption, /timeline-compressor --business-transformation

### `/write-tests`
> Entrada gerada automaticamente; personalize conforme o contexto real antes de integrá-la à categoria definitiva.
- **Capacidades**: Write comprehensive unit and integration tests with proper mocking and coverage.
- **Momento ideal**: Quando for necessário write comprehensive unit and integration tests with proper mocking and coverage.
- **Exemplo de momento**: Ex.: Utilize /write-tests <target-file> durante Write Tests.
- **Tipo de saida**: Blueprint em Markdown com instruções detalhadas para Write Tests.
- **Exemplos**: /write-tests, /write-tests <target-file>, /write-tests <test-type>, /write-tests --unit, /write-tests --integration
