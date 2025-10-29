# 🔒 Security Scripts - TradingSystem

Scripts de segurança e monitoramento para o TradingSystem (WSL2).

## 📁 Arquivos

- **`monitor-docker-access.sh`** - Monitor em tempo real de acessos aos containers Docker
- **`analyze-docker-logs.sh`** - Analisador de logs históricos de acesso
- **`README.md`** - Este arquivo

## 🎯 Por que estes scripts?

### Problema Identificado

O agent `docker-health-optimizer` identificou que:

1. ✅ Credenciais no `.env` estão expostas via `docker inspect`
2. ✅ Qualquer usuário do grupo `docker` pode ver as credenciais
3. ❌ `auditd` não funciona no WSL2 (limitação do kernel)

### Solução Implementada

**Camada 1: Permissões do .env (✅ APLICADO)**
```bash
chmod 600 .env  # Apenas owner (você) pode ler
```

**Camada 2: Monitoramento Docker Events (✅ SCRIPTS CRIADOS)**
- Alternativa ao `auditd` que funciona no WSL2
- Monitora comandos `docker exec`, `docker inspect` indiretamente
- Logs salvos em `logs/security/`

---

## 🚀 Como Usar

### 1. Monitoramento em Tempo Real

**Monitor interativo** (mostra eventos ao vivo):

```bash
bash scripts/security/monitor-docker-access.sh
```

**Saída esperada:**
```
╔════════════════════════════════════════════════════════╗
║   🔍 Docker Access Monitor (WSL2)                    ║
║   Monitorando eventos de containers...               ║
║   Logs salvos em: logs/security/                     ║
╚════════════════════════════════════════════════════════╝

✅ Monitoramento ativo - Pressione Ctrl+C para sair

⚠️  [14:32:15] EXEC em container: apps-tp-capital (user: marce)
▶️  [14:32:20] Container iniciado: data-timescaledb
⏹️  [14:35:10] Container parado: apps-workspace
```

**Monitor em background** (roda continuamente):

```bash
# Iniciar
nohup bash scripts/security/monitor-docker-access.sh > /dev/null 2>&1 &

# Verificar se está rodando
ps aux | grep monitor-docker-access

# Parar
pkill -f monitor-docker-access
```

---

### 2. Análise de Logs Históricos

**Análise completa** (todas as atividades):

```bash
bash scripts/security/analyze-docker-logs.sh
```

**Saída esperada:**
```
═══════════════════════════════════════════════════════════
  📊 Docker Access Log Analyzer
═══════════════════════════════════════════════════════════

✅ 3 arquivo(s) de log encontrado(s)

📈 Estatísticas de Acesso
─────────────────────────────────────────────────────────
Total de eventos: 247

Eventos por tipo:
  ℹ️  [INFO]: 235 eventos
  ⚠️  [WARNING]: 10 eventos
  ❌ [ERROR]: 2 eventos

Containers mais acessados:
  apps-tp-capital: 45 acessos
  data-timescaledb: 32 acessos
  apps-workspace: 28 acessos
  docs-api: 15 acessos
  ollama: 8 acessos

⚠️  ALERTA: 10 comando(s) EXEC detectado(s)
   Comandos exec podem indicar acesso direto aos containers

Últimos 5 comandos EXEC:
  → [2025-10-29 14:32:15] [WARNING] EXEC command in container apps-tp-capital by user marce
  → [2025-10-29 14:35:20] [WARNING] EXEC command in container data-timescaledb by user marce
  ...
```

**Apenas eventos suspeitos**:

```bash
bash scripts/security/analyze-docker-logs.sh --suspicious
```

**Análise de hoje**:

```bash
bash scripts/security/analyze-docker-logs.sh --today
```

**Análise da semana**:

```bash
bash scripts/security/analyze-docker-logs.sh --week
```

---

## 📊 Interpretando os Logs

### Tipos de Eventos

| Evento | Descrição | Nível |
|--------|-----------|-------|
| **EXEC** | Comando executado dentro do container (`docker exec`) | ⚠️ WARNING |
| **start** | Container iniciado | ℹ️ INFO |
| **stop** | Container parado normalmente | ℹ️ INFO |
| **die** | Container morreu inesperadamente | ❌ ERROR |
| **restart** | Container reiniciado | ⚠️ WARNING |

### Eventos Suspeitos

🔴 **ALTA PRIORIDADE:**
- `EXEC` em containers de banco de dados (data-timescaledb, data-qdrant)
- `die` repetidos (indica instabilidade)
- `EXEC` fora do horário de trabalho (madrugada)

🟡 **MÉDIA PRIORIDADE:**
- `EXEC` em containers de aplicação (apps-tp-capital, apps-workspace)
- `restart` frequentes (mais de 5x/dia)

🟢 **BAIXA PRIORIDADE:**
- `start`/`stop` normais (durante desenvolvimento)
- `EXEC` ocasionais (debugging normal)

---

## 🔍 Exemplos de Uso

### Cenário 1: Alguém acessou meu container?

```bash
# Ver últimas 24h
bash scripts/security/analyze-docker-logs.sh --today

# Procurar por EXEC
grep "EXEC" logs/security/docker-access-*.log
```

### Cenário 2: Container morreu, por quê?

```bash
# Ver eventos de morte
bash scripts/security/analyze-docker-logs.sh --suspicious | grep "die"

# Ver contexto antes da morte
grep "apps-tp-capital" logs/security/docker-access-$(date +%Y%m%d).log | tail -20
```

### Cenário 3: Monitorar produção

```bash
# Iniciar monitor em background
nohup bash scripts/security/monitor-docker-access.sh > /dev/null 2>&1 &

# Analisar diariamente
crontab -e
# Adicionar: 0 9 * * * /home/marce/Projetos/TradingSystem/scripts/security/analyze-docker-logs.sh --today
```

---

## 🛡️ Nível de Segurança Atual

Após aplicar estas soluções:

| Proteção | Status | Detalhes |
|----------|--------|----------|
| **Permissões .env** | ✅ PROTEGIDO | `chmod 600` - apenas você lê |
| **Grupo Docker** | ✅ RESTRITO | Apenas `marce` no grupo |
| **Auditoria de Acesso** | ✅ ATIVO | Via Docker Events |
| **Logs de Acesso** | ✅ SALVOS | `logs/security/` |
| **Exposição via inspect** | ⚠️ LIMITADO | Visível apenas para você |

**Nível de Risco:**
- 🔴 **ANTES:** CRÍTICO (qualquer usuário via .env 644)
- 🟢 **DEPOIS:** BAIXO (apenas você + root)

---

## 📝 Logs

Todos os logs são salvos em:

```
logs/security/docker-access-YYYYMMDD.log
```

**Formato:**
```
[2025-10-29 14:32:15] [WARNING] EXEC command in container apps-tp-capital by user marce
[2025-10-29 14:32:20] [INFO] Container started: data-timescaledb
[2025-10-29 14:35:10] [INFO] Container stopped: apps-workspace
```

**Rotação de Logs:**
- Arquivo novo por dia (`docker-access-20251029.log`)
- Nenhuma rotação automática (você decide quando limpar)

**Limpeza de Logs Antigos:**

```bash
# Remover logs com mais de 30 dias
find logs/security -name "docker-access-*.log" -mtime +30 -delete

# Comprimir logs antigos
find logs/security -name "docker-access-*.log" -mtime +7 -exec gzip {} \;
```

---

## 🚨 Limitações (WSL2)

❌ **O que NÃO funciona no WSL2:**
- `auditd` (Linux audit subsystem)
- Auditoria a nível de kernel
- Integração com `ausearch`

✅ **O que FUNCIONA no WSL2:**
- Docker Events (nativo do Docker)
- Logs de acesso aos containers
- Monitoramento de `exec`, `start`, `stop`, `die`
- Análise histórica de eventos

---

## 🔄 Próximos Passos (Opcional)

### Para Produção (Linux nativo):

Se migrar para Linux nativo (não WSL2), você pode usar `auditd`:

```bash
# Instalar auditd
sudo apt-get install auditd -y

# Adicionar regras
sudo auditctl -w /var/run/docker.sock -p wa -k docker_access

# Ver logs
sudo ausearch -k docker_access -ts recent
```

### Para Máxima Segurança:

Implementar **Docker Secrets** (file-based) ao invés de `env_file`:

```yaml
secrets:
  telegram_bot_token:
    file: ./secrets/telegram_bot_token

services:
  tp-capital:
    secrets:
      - telegram_bot_token
    environment:
      TELEGRAM_BOT_TOKEN_FILE: /run/secrets/telegram_bot_token
```

**Benefício:** Credenciais **NÃO** aparecem em `docker inspect`!

---

## 📞 Suporte

Problemas? Verifique:

1. **Monitor não inicia:**
   ```bash
   # Verificar se Docker está rodando
   docker info

   # Verificar dependências
   which jq || sudo apt-get install jq -y
   ```

2. **Logs vazios:**
   ```bash
   # Verificar diretório
   ls -la logs/security/

   # Verificar permissões
   ls -ld logs/security/
   ```

3. **Eventos não aparecem:**
   ```bash
   # Testar Docker events manualmente
   docker events --filter 'type=container' &
   docker ps
   # Deve aparecer eventos
   ```

---

## 📚 Referências

- [Docker Events API](https://docs.docker.com/engine/reference/commandline/events/)
- [WSL2 Limitations](https://github.com/microsoft/WSL/issues/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

---

**Criado por:** docker-health-optimizer agent + Claude Code
**Data:** 2025-10-29
**Versão:** 1.0.0
