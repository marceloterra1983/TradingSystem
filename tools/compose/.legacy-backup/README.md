# Legacy Compose Files - Backup

**Data de Arquivamento:** 2025-11-11
**Motivo:** Consolidação da Telegram Stack em arquivo único oficial

---

## 📦 Arquivos Arquivados

### 1. `docker-compose.4-2-telegram-stack.yml`
- **Tamanho:** 17KB
- **Última Modificação:** 2025-11-11
- **Motivo do Arquivamento:** Versão antiga sem minimal port exposure
- **Substituído por:** `docker-compose.4-2-telegram-stack-minimal-ports.yml`

**Diferenças principais:**
- Expunha mais portas externamente (menos seguro)
- Não seguia padrão minimal port exposure
- Configuração menos otimizada

### 2. `docker-compose.4-2-telegram-stack-monitoring.yml`
- **Tamanho:** 7.3KB
- **Última Modificação:** 2025-11-09
- **Motivo do Arquivamento:** Monitoring integrado ao arquivo principal
- **Substituído por:** Seção de monitoring em `docker-compose.4-2-telegram-stack-minimal-ports.yml`

**Conteúdo:**
- telegram-prometheus
- telegram-grafana
- telegram-postgres-exporter
- telegram-redis-exporter

**Integração:** Todos os 4 containers de monitoramento foram integrados ao arquivo oficial, totalizando 12 containers na stack completa.

---

## 📄 Arquivo Oficial Atual

**Nome:** `docker-compose.4-2-telegram-stack-minimal-ports.yml`
**Localização:** `tools/compose/docker-compose.4-2-telegram-stack-minimal-ports.yml`
**Containers:** 12 (8 core + 4 monitoring)
**Status:** ✅ Produção - Oficial

**Vantagens:**
- ✅ Stack completa em arquivo único
- ✅ Minimal port exposure (segurança)
- ✅ Monitoramento integrado
- ✅ Health checks padronizados
- ✅ Resource limits configurados
- ✅ Documentação completa

---

## 🔄 Migração

### Se você estava usando os arquivos legados:

**Antes (2 comandos):**
```bash
# Iniciar core services
docker compose -f docker-compose.4-2-telegram-stack.yml up -d

# Iniciar monitoring (separado)
docker compose -f docker-compose.4-2-telegram-stack-monitoring.yml up -d
```

**Agora (1 comando):**
```bash
# Iniciar stack completa
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml up -d
```

### Migração Manual

```bash
# 1. Parar stacks antigas (se estiverem rodando)
docker compose -f .legacy-backup/docker-compose.4-2-telegram-stack.yml down
docker compose -f .legacy-backup/docker-compose.4-2-telegram-stack-monitoring.yml down

# 2. Iniciar stack oficial
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml up -d

# 3. Verificar migração
docker ps --filter "label=com.tradingsystem.stack=telegram-gateway"
```

**Nota:** Os volumes Docker foram preservados, portanto nenhum dado é perdido.

---

## 📚 Documentação Atualizada

### Guias Oficiais

1. **[Deployment Guide](../../docs/content/tools/telegram/deployment-guide.mdx)**
   - Guia completo de deploy
   - Operações (start/stop/logs/backup)
   - Troubleshooting
   - Escalabilidade

2. **[TELEGRAM-ISSUES-SUMMARY.md](../../TELEGRAM-ISSUES-SUMMARY.md)**
   - Problemas conhecidos
   - Soluções disponíveis
   - Status da stack

3. **[TELEGRAM-MONITORING-INTEGRATION.md](../../docs/TELEGRAM-MONITORING-INTEGRATION.md)**
   - Detalhes da integração de monitoramento
   - Métricas disponíveis
   - Dashboards sugeridos

4. **[Port Registry](../../docs/content/tools/ports-services.mdx)**
   - Portas oficiais do Telegram Stack
   - Registro completo de serviços

5. **[CLAUDE.md](../../CLAUDE.md)**
   - Referência rápida da Telegram Stack
   - Quick start
   - Comandos úteis

---

## ⚠️ Importante

**ESTES ARQUIVOS SÃO LEGADOS E NÃO DEVEM SER USADOS EM PRODUÇÃO.**

Se você precisa consultar configurações antigas:
- ✅ Os arquivos estão preservados neste diretório
- ✅ Use apenas para referência histórica
- ❌ Não use para novos deployments
- ❌ Não misture com arquivo oficial

---

## 🗓️ Linha do Tempo

- **2025-11-09:** Criação inicial da stack Telegram
- **2025-11-09:** Separação de monitoring em arquivo próprio
- **2025-11-11:** Integração de monitoring ao arquivo principal
- **2025-11-11:** Arquivamento de versões legadas
- **2025-11-11:** Oficialização de `minimal-ports.yml` como stack oficial

---

## 📧 Suporte

Para questões sobre a Telegram Stack oficial:
1. Consulte [Deployment Guide](../../docs/content/tools/telegram/deployment-guide.mdx)
2. Verifique [Issues Summary](../../TELEGRAM-ISSUES-SUMMARY.md)
3. Abra issue no repositório com label `telegram-stack`

---

**Última Atualização:** 2025-11-11
**Status:** Arquivado - Preservado para referência histórica
