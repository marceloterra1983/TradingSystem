# ⚠️ scripts/maintenance/dangerous

Scripts destrutivos usados apenas para recuperação de desastres. Eles param containers,
matam processos locais e podem remover redes/volumes. Sempre execute `bash scripts/maintenance/health-check-all.sh`
e um backup completo antes de usar qualquer item aqui.

| Script | Uso típico | Requisitos |
| ------ | ---------- | ---------- |
| `cleanup-and-restart.sh` | Para tudo, dá prune agressivo e sobe as stacks em ordem. | Docker saudável + compose files existentes |
| `limpar-portas-e-iniciar-tudo.sh` | Mata processos em dezenas de portas antes de religar RAG/Kong/stacks críticas. | Execução como usuário que pode matar processos locais |
| `nuclear-reset.sh` | Remove containers, imagens e redes para um reset total. | Perde cache/volumes; confirme backup antes |

> Nunca versionamos novas automações aqui sem revisão dupla. Se precisar rodar qualquer script
desta pasta em produção, abra um ticket no Governance Hub antes.
