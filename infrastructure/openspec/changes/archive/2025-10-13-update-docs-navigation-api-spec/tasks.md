## 1. Planejamento & Contexto
- [x] 1.1 Revisar contexto e requisitos para navegação de docs.
- [x] 1.2 Validar sidebars/autogeradas para garantir que novas páginas aparecem corretamente.

## 2. Implementação Docusaurus
- [x] 2.1 Criar landing page `api-overview` com resumo dos serviços.
- [x] 2.2 Atualizar `docs/context/shared/tools/openspec/README.md` com seção de acesso rápido.
- [x] 2.3 Ajustar `docs/docusaurus.config.ts` com abas `API` e `Spec`.
- [x] 2.4 Revisar sidebar (autogerado) e confirmar ausência de ajustes adicionais.

## 3. Verificação
- [x] 3.1 Rodar build das docs (`npm run build`)
- [x] 3.2 Executar `openspec validate update-docs-navigation-api-spec --strict`.

## 4. Documentação/Follow-up
- [x] 4.1 Registrar notas no changelog ou README das docs.
- [x] 4.2 Destacar instruções de uso das novas abas no material de docs (seção “Acesso rápido”/landing).
