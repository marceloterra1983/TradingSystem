## 1. Pré-trabalho
- [x] 1.1 Revisar specs existentes (`openspec/specs/service-launcher`, `openspec/specs/docs-navigation`, `openspec/specs/dashboard/system-flow`).
- [x] 1.2 Mapear serviços adicionais a monitorar (Dashboard 3101, Docusaurus 3004, QuestDB 9000, Prometheus 9090, Grafana 3000).

## 2. Laucher
- [x] 2.1 Atualizar `SERVICE_TARGETS` com novos serviços/containers e ajustar lógica se necessário (paths, método HEAD).
- [x] 2.2 Adicionar testes cobrindo novos targets/metadados.

## 3. Documentação Docusaurus
- [x] 3.1 Criar landing `Runbooks & ADR Overview` (links para categorias relevantes).
- [x] 3.2 Atualizar navegação/sidebars se necessário para expor a nova página.

## 4. Dashboard Configurações
- [x] 4.1 Implementar nova página/aba sob Configurações conforme briefing (abaixo do header, conteúdo inicial placeholder + layout).
- [x] 4.2 Adicionar specs/deltas se necessário e atualizar componentes.
- [x] 4.3 Criar testes se aplicável (Vitest ou e2e) para garantir renderização básica. *(N/A - componente usa placeholders, cobertura manual suficiente nesta iteração)*

## 5. Verificação & Wrap-up
- [x] 5.1 Rodar `npm run test` em serviços alterados (Laucher + dashboard).
- [x] 5.2 Rodar `npm run build` em `docs`.
- [x] 5.3 Executar `openspec validate enhance-ops-visibility --strict`.
- [x] 5.4 Atualizar changelog/notas de docs.
