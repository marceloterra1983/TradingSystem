## 1. Laucher API
- [x] 1.1 Atualizar handler de `/api/status` para calcular `overallStatus` e métricas agregadas.
- [x] 1.2 Incluir timestamp `lastCheckAt` (UTC) e métricas `totalServices`, `degradedCount`.
- [x] 1.3 Adicionar testes cobrindo cenários normal e serviços degradados.

## 2. Dashboard
- [x] 2.1 Consumir novos campos no card de status e renderizar semáforo.
- [x] 2.2 Atualizar Zustand store/selectors se necessário (não requerido, card trata estado local).
- [x] 2.3 Testar fallback quando campos agregados não estiverem presentes.

## 3. Documentação
- [x] 3.1 Atualizar `docs/context/frontend/apps/service-launcher/` com exemplos da nova resposta.
- [x] 3.2 Registrar release note no changelog operacional.

## 4. Validação
- [x] 4.1 Executar `openspec validate add-service-launcher-health-summary --strict`.
- [x] 4.2 Rodar testes automatizados afetados (API + frontend).
