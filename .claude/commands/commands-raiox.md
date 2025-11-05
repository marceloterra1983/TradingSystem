<!-- schemaVersion: 1.1.0 -->

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

<!-- AUTO-COMMANDS:START -->
<!-- AUTO-COMMANDS:END -->
