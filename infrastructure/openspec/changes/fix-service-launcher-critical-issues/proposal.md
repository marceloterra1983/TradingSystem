## Why
O Service Launcher possui problemas críticos que impedem funcionamento correto:
- **Conflito de portas**: código usa 9999 mas sistema espera 3500, causando falha na integração com Dashboard
- **Carregamento incorreto de .env**: viola padrão do projeto carregando .env local ao invés do root
- **Portas de serviços incorretas**: library-api configurada como 3102 quando deveria ser 3200
- **Typo generalizado**: "Laucher" ao invés de "Launcher" em ~90 arquivos
- **Falta de variáveis .env**: nenhuma configuração SERVICE_LAUNCHER_* documentada no .env central

Estes problemas causam falhas de health checks, configuração difícil e inconsistência profissional.

## What Changes
- **[P0-BREAKING]** Corrigir porta default de 9999 para 3500 no server.js
- **[P0-BREAKING]** Corrigir carregamento de dotenv para apontar ao root do projeto
- **[P0]** Atualizar configuração de library-api de porta 3102 para 3200
- **[P1]** Corrigir typo "Laucher" → "Launcher" em todo o código e documentação
- **[P1]** Adicionar todas as variáveis SERVICE_LAUNCHER_* ao .env.example
- **[P2]** Implementar logging estruturado com Pino (padrão do projeto)
- **[P2]** Adicionar suite de testes completa (endpoints, config, integração)
- **[P2]** Reescrever documentação seguindo DOCUMENTATION-STANDARD.md

## Impact
- **Affected specs**: `service-launcher` (new capability)
- **Affected code**: 
  - `frontend/apps/service-launcher/server.js` (main logic)
  - `frontend/apps/service-launcher/README.md`
  - `docs/context/backend/api/service-launcher/README.md`
  - `scripts/startup/start-service-launcher.{sh,ps1}`
  - ~90 arquivos com typo "Laucher"
- **Breaking changes**: 
  - Porta default muda de 9999 para 3500 (já esperado pelo sistema)
  - Scripts que usam porta hardcoded precisam atualizar
- **Dependencies**: Nenhuma mudança em dependências externas

## Rollout
1. **Fase 1 - Correções Críticas (P0)**: ~2.5h
   - Deploy em ambiente de dev/teste primeiro
   - Validar integração com Dashboard
   - Confirmar health checks funcionando

2. **Fase 2 - Consistência (P1)**: ~3-4h
   - Buscar e substituir "Laucher" → "Launcher"
   - Adicionar variáveis ao .env.example
   - Atualizar documentação básica

3. **Fase 3 - Qualidade (P2)**: ~10-14h
   - Implementar logging estruturado
   - Criar suite de testes
   - Documentação completa com PlantUML

4. **Validação Final**:
   - Rodar todos os testes: `npm test`
   - Validar Dashboard: `http://localhost:3103`
   - Verificar health endpoint: `curl http://localhost:3500/api/status`
   - Monitorar logs por 24h

## Migration Guide
Para usuários/scripts que usam porta 9999:
```bash
# ANTES
SERVICE_LAUNCHER_PORT=9999
curl http://localhost:9999/api/status

# DEPOIS
SERVICE_LAUNCHER_PORT=3500  # Agora default
curl http://localhost:3500/api/status
```

Scripts de startup já suportam ambas as portas como fallback durante transição.

