# data-platform Specification (Delta)

## ADDED Requirements
### Requirement: Provide Managed TimescaleDB Stack
The platform MUST disponibilizar um cluster PostgreSQL 15 com extensão TimescaleDB via Docker Compose para workloads analíticos, mantendo QuestDB como camada de ingestão primária.

#### Scenario: Timescale stack provisioned
- GIVEN a infraestrutura Docker Compose está operacional
- WHEN a stack `data-timescale` é iniciada
- THEN existe um serviço `timescaledb` exposto na porta configurada (ex.: 5433) com credenciais gerenciadas
- AND o serviço possui volume persistente e política de backup documentada

### Requirement: Synchronize Priority Datasets
O sistema MUST replicar periodicamente dados críticos (sinais, execuções, métricas de performance) do QuestDB para TimescaleDB sem introduzir acoplamento síncrono.

#### Scenario: Replication job runs
- GIVEN sinais novos foram gravados em QuestDB
- WHEN o job/serviço de replicação executa
- THEN as linhas correspondentes são inseridas/atualizadas na hypertable Timescale `trading_signals`
- AND o atraso máximo entre QuestDB e TimescaleDB é menor ou igual a 5 minutos
- AND falhas de replicação são registradas em log/alerta operacional

### Requirement: Enforce Retention and Compression Policies
TimescaleDB MUST aplicar políticas de compressão e retenção adequadas, sincronizadas com o ciclo de vida dos dados em QuestDB.

#### Scenario: Retention policy execution
- GIVEN dados mais antigos que o limite definido existem em TimescaleDB
- WHEN a política de retenção roda
- THEN os chunks excedentes são removidos ou comprimidos conforme a política
- AND a compressão/retention não diverge do que está configurado em QuestDB (documentado)

### Requirement: Monitor Replication and Timescale Health
O sistema MUST expor métricas (Prometheus) e alertas para atraso de replicação e disponibilidade do TimescaleDB.

#### Scenario: Replication delay alert
- GIVEN o atraso de replicação excede o SLA (ex.: 5 minutos)
- WHEN o job de monitoramento verifica o atraso
- THEN um alerta é disparado (Prometheus/Grafana ou equivalente)
- AND a equipe operacional recebe instruções de mitigação documentadas

### Requirement: Document Dual-Storage Operations
A documentação MUST descrever claramente quando usar QuestDB versus TimescaleDB, comandos de operação (backup, retention) e impactos nas rotinas de reporting.

#### Scenario: Operator needs guidance
- GIVEN um operador acessa `docs/context/backend/data/`
- WHEN ele procura por “QuestDB + TimescaleDB”
- THEN a página explica a arquitetura dual, scripts de replicação, políticas de compressão e procedimentos de recuperação
- AND referencia os guias práticos em `guides/data/` para tarefas do dia a dia
