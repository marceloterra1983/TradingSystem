---
title: "ADR-015: Port Governance Policy"
slug: /reference/adrs/015-port-governance
description: "Decision record defining TradingSystem's port governance process and automation."
tags: [adr, architecture, governance, ports, infrastructure]
domain: architecture
type: guide
summary: "Architecture decision record for port allocation governance policy to prevent conflicts"
status: active
owner: ArchitectureGuild
last_review: "2025-11-08"
lastReviewed: '2025-11-08'
---
---

# ADR-015: Port Governance Policy

**Status:** 🟢 Aprovação em andamento  
**Data:** 2025-11-05  
**Autores:** Platform Architecture  
**Relacionado a:** port-governance-2025-11-05

---

## 🎯 Contexto

- 8–12 conflitos de portas por mês (porta duplicada em scripts, Compose e serviços locais).
- Documentação desatualizada (menos de 70% de acurácia) e `.env` divergentes.
- Integrações como Telegram MTProto dependiam de processos nativos (`localhost:4007`), quebrando containers.

## ✅ Decisão

1. **Registro Único (`config/ports/registry.yaml`)** com owner, descrição, healthcheck e stack.
2. **Faixas Reservadas** definidas em [`docs/content/governance/port-governance/port-ranges.mdx`](../../governance/port-governance/port-ranges.mdx).
3. **Automação Oficial (`npm run ports:sync`)** para gerar `.env.shared`, Compose dictionary, docs e health script.
4. **Validação Automática** via `.husky/pre-commit` + GitHub Action `port-governance.yml`.
5. **Containerização do MTProto** (porta 4007) e ajuste de consumidores (ex.: REST API).

## 📌 Consequências

| Positivo | Negativo / Mitigação |
|----------|----------------------|
| Portos rastreáveis e auditáveis. | Devs devem atualizar registry antes de expor novas portas. |
| Docs e `.env` sincronizados automaticamente. | `ports:sync` adiciona arquivos ao staging; comunicar no onboarding. |
| CI impede conflitos antes do merge. | Builds falham se scripts locais criarem portas novas; fornecer guia rápido. |
| Health script único para todos os serviços. | Requer que stacks principais estejam em execução para obter “verde”. |
| Possibilita containerização total do Telegram stack. | Serviços herdados precisarão de migração gradual. |

## 🔄 Processo

1. Solicitar nova porta via PR editando `registry.yaml` (incluindo owner, stack e health).
2. Executar `npm run ports:sync` e commitar artefatos gerados.
3. Revisores de Arquitetura + DevOps validam faixa e descrição.
4. CI (`port-governance.yml`) e pre-commit reforçam validações.
5. Após merge, atualizar operating guides relevantes.

## 🛡️ Enforcement

- PR bloqueado se `registry.yaml` não passar em `ports:validate`, `ports:scan-hardcoded` ou `ports:sync`.
- Scripts de inicialização passam a consumir variáveis de `.env.shared`.
- Inventário oficial mantido em `reports/ports/port-inventory.xlsx`.
- Health monitoring (`scripts/maintenance/ports-health.sh`) roda nos pipelines de stack health.

## 📚 Referências

- Diretório `tools/openspec/changes/port-governance-2025-11-05`
- [Port ranges doc](../../governance/port-governance/port-ranges.mdx)
- Arquivo `config/ports/registry.yaml`
