## Why
- QuestDB atende bem a ingestão em tempo real, porém precisamos de recursos relacionais e compressão avançada para dados históricos (ex.: análises multidimensionais, integrações externas).
- TimescaleDB (PostgreSQL + extensões) oferece hypertables, policies de retenção e ecosistema SQL que funções atuais de relatórios demandam.
- Objetivo é complementar, não substituir: manter QuestDB para ingestão de baixa latência e usar TimescaleDB como camada analítica/relacional.

## What Changes
- Casos de uso alvo incluem dashboards históricos de performance, integrações BI com SQL padrão, auditoria de ordens e análises multidimensionais hoje bloqueadas pela falta de joins/retention avançada.
- Abordar riscos operacionais: sizing (CPU/RAM/IOPS), crescimento de storage, governança de credenciais, monitoramento e plano de fallback caso TimescaleDB fique indisponível.
- Provisionar um serviço PostgreSQL 15 com TimescaleDB (via Docker Compose) com parâmetros de desempenho adequados.
- Implementar replicação/ingestão assíncrona de dados relevantes do QuestDB para TimescaleDB (batch ou streaming) sem bloquear o pipeline atual.
- Definir esquema TimescaleDB inicial (tabelas para sinais, execuções, métricas) e políticas de compressão/retention.
- Atualizar documentação (guides + docs/context) descrevendo arquitetura dual QuestDB + TimescaleDB, rotinas de replicação e planos de migração incremental.
- Documentar políticas de retenção/compressão e cobrir monitoramento (alertas Prometheus/Grafana) específico para a nova stack.

## Impact
- Relatórios e integrações externas poderão usar SQL padrão + extensões Timescale sem sobrecarregar QuestDB.
- Novas funcionalidades (dashboards históricos, BI) ganham base consistente sem alterar o fluxo de baixa latência.
- A complexidade operacional aumenta (dois bancos), exigindo monitoramento e playbooks adicionais.

## Rollout
1. Provisionar instância TimescaleDB via Docker Compose (stack dedicada), dimensionando CPU/RAM/storage e configurando TLS/credenciais seguras.
2. Configurar infraestrutura (volumes, usuários, backup automático, alertas básicos).
3. Implantar conector/ETL (serviço Python ou jobs SQL) replicando dados prioritários e executando seed inicial.
4. Validar consultas, compressão, políticas de retenção e monitoramento (Prometheus/Grafana + alertas).
5. Preparar plano de fallback (ex.: desligar replicação, reroute para QuestDB) e treinar equipe com documentação operacional.
