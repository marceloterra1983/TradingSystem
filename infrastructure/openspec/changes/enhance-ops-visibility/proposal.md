## Why
- Precisamos ampliar o monitoramento do Laucher para cobrir serviços adicionais (dashboard, documentação, QuestDB) e obter visão operacional única.
- Usuários do Docusaurus solicitam landing dedicada para Runbooks e ADRs, similar ao resumo de APIs, facilitando encontrar guias operacionais/arquiteturais.
- Páginas críticas do dashboard (Overview/Connections/Configurações) precisam de specs formais para garantir consistência; também foi pedido um novo card/página dentro da seção Configurações.

## What Changes
- Estender `SERVICE_TARGETS` do Laucher para abranger novos serviços/containers e enriquecer metadados.
- Criar landing agregada para Runbooks + ADRs no Docusaurus e atualizar navegação se necessário.
- Formalizar specs do fluxo do dashboard (Overview, Connections, Configurações) e adicionar página extra em Configurações.

## Impact
- Melhor visibilidade operacional sem precisar checar múltiplas fontes.
- Documentação mais navegável para incidentes (runbooks) e decisões (ADR), acelerando onboarding.
- Dashboard alinhado com specs, reduzindo divergências entre UX planejada e implementation details.

## Rollout
- Implementar e testar localmente (Laucher tests + dashboard tests + `npm run build` do Docusaurus).
- Validar com `openspec validate enhance-ops-visibility --strict`.
- Atualizar changelog/documentação conforme necessário e planejar arquivamento após revisão.
