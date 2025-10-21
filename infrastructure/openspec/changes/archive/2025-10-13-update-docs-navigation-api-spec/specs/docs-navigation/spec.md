# Delta for Docs Navigation

## ADDED Requirements
### Requirement: Provide Primary Navigation Tabs
The Docusaurus navbar MUST expor tabs `Docs`, `API`, `API Hub` e `Spec` para acesso rápido aos domínios principais.

#### Scenario: Default navbar render
- WHEN o site do Docusaurus carrega
- THEN o navbar mostra os tabs `Docs`, `API`, `API Hub` e `Spec`
- AND cada tab abre a respectiva página resumida

### Requirement: Publish API Overview Landing
The documentation MUST disponibilizar a página `/docs/api-overview` com resumo dos serviços, portas e links para detalhes.

#### Scenario: API overview visit
- WHEN alguém acessa `/docs/api-overview`
- THEN a página lista os serviços Idea Bank, TP Capital, B3 Market Data, Documentation API e Service Launcher com propósito, porta e link para detalhes

### Requirement: Highlight OpenSpec Workflow
The documentation MUST destacar o fluxo OpenSpec na rota `/openspec` incluindo comandos rápidos e links para specs.

#### Scenario: Spec landing visit
- WHEN um usuário acessa `/openspec`
- THEN a página exibe uma seção de acesso rápido com os principais comandos (`list`, `list --specs`, `validate`, `archive`) e orientações de colaboração.
