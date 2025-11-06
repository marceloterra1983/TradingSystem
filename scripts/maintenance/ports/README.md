# scripts/maintenance/ports

Utilitários rápidos para liberar portas presas e encerrar proxies nativos.
Os scripts são idempotentes e não tocam containers Docker.

| Script | O que faz |
| ------ | --------- |
| `kill-docker-proxy-8111.sh` | Mata proxies `docker-proxy` que travam o LangGraph Proxy (porta 8111). |
| `kill-postgres-nativo.sh` | Finaliza instâncias locais do Postgres que ocupam as portas 5432-5450. |
| `liberar-porta-5050.sh` | Libera a porta 5050 utilizada pelo Firecrawl dashboard. |

Execute direto pela raiz com `bash scripts/maintenance/ports/<script>.sh`.
