## Why
- Serviço Workspace ainda depende de QuestDB/LowDB e não integra com a instância Timescale/PostgreSQL padronizada na infraestrutura.
- API falha ao conectar no novo endpoint `postgresql://workspace:workspace@localhost:5433/workspace?schema=public`, bloqueando backlog de ideias na UI e nos consumidores (Dashboard, Agno Agents).
- Documentação e playbooks continuam descrevendo fluxo QuestDB, gerando instruções conflitantes para operação, migrações e observabilidade.

## What Changes
- Migrar a estratégia padrão de persistência do Workspace para PostgreSQL (Prisma + Timescale) eliminando código QuestDB/LowDB em produção.
- Ajustar configuração, scripts e métricas para refletir o uso de PostgreSQL (pooling, retries, backup/restore, exporters) e garantir acesso ao schema `public`.
- Revisar consumers (Dashboard, Agno Agents, automações) para validar compatibilidade com respostas e erros vindos do backend atualizado.
- Atualizar documentação técnica (README, guides, ENV) e especificações OpenSpec criando/atualizando capability "workspace" com requisitos pós-migração.
- Fornecer plano de rollback/migração de dados (scripts LowDB → PostgreSQL, backup QuestDB final) e teste de fumaça automatizado contra banco real.

## Impact
- Serviço Workspace volta a operar de forma confiável usando a stack oficial de bancos relacionais, destravando integrações que dependem de SQL avançado.
- Equipe passa a seguir um fluxo único de operação (backup, métricas, healthchecks) alinhado às demais APIs que já usam PostgreSQL.
- Remoção de código QuestDB/LowDB reduz superfície de manutenção, mas requer coordenação cuidadosa para evitar interrupção durante cutover.

## Rollout
1. Provisionar e validar acesso ao banco `workspace` (usuário dedicado, schema `public`, migração Prisma) na instância Timescale/PostgreSQL.
2. Refatorar serviço Workspace (configurações, repositórios, métricas, scripts) e executar suíte de testes + smoke tests com banco real.
3. Revisar e atualizar documentação + specs OpenSpec, rodar `openspec validate --strict`, alinhar consumidores e liberar plano de operação/rollback.
