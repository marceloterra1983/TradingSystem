## Why
- Equipe precisa de visão rápida das referências de API e das especificações OpenSpec diretamente no portal Docusaurus.
- Navbar atual expõe somente `Docs` e `API Hub`, dificultando acesso às specs e a um resumo centralizado das APIs.
- Revisão geral da documentação permite atualizar conteúdo existente e orientar novos colaboradores sobre uso do OpenSpec.

## What Changes
- Criar abas dedicadas `API` e `Spec` no navbar do Docusaurus com landing pages resumindo endpoints e fluxo OpenSpec.
- Atualizar páginas existentes relevantes (ex.: guia do OpenSpec) com links cruzados/estrutura ajustada.
- Garantir que estrutura do Docusaurus continue consistente e localizada conforme padrões.

## Impact
- Facilita onboarding e consulta rápida às APIs e specs sem navegar por várias seções.
- Torna o fluxo OpenSpec visível para todo o time direto na doc.
- Permite planejar futuras integrações (ex.: incluir auto-listagem de specs) com base em layout consolidado.

## Rollout
- Implementar mudanças localmente, rodar `npm run start -- --port 3004` para checar layout.
- Validar `openspec validate update-docs-navigation-api-spec --strict`.
- Após revisão, preparar PR destacando novas abas/páginas e atualizar changelog de documentação caso aplicável.
