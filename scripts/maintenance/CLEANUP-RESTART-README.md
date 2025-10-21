# 🧹 Cleanup & Restart Script

## Visão Geral

Script completo de limpeza e reinicialização do TradingSystem. Remove containers órfãos, limpa logs e reinicia tudo do zero.

## 🚀 Quick Start

### Uso Básico

```bash
# Limpeza completa + restart
bash scripts/maintenance/cleanup-and-restart.sh

# Ou use o shortcut da raiz
bash cleanup-restart
```

### Depois de Instalar Shortcuts

```bash
# Adicionar ao install-shortcuts.sh e depois:
cleanup-restart
```

## 📋 O Que o Script Faz

### 1. Para Todos os Serviços (Force Kill)
- Executa `stop --force`
- Para TODOS os processos Node.js
- Para TODOS os containers Docker

### 2. Remove Containers Órfãos
Remove containers específicos que podem ficar órfãos:
- `data-frontend-apps`
- `infra-langgraph-dev`
- `infra-postgres-dev`
- `infra-redis-dev`
- E executa `docker container prune -f`

### 3. Limpa Logs (Opcional)
- Remove arquivos `*.log` de `/tmp/tradingsystem-logs/`
- Remove arquivos `*.log.old*`

### 4. Verifica Limpeza
Checa se tudo foi parado:
- ✅ Processos Node.js
- ✅ Containers Docker
- ✅ Portas conhecidas (3103, 3004, 3200, etc.)

### 5. Reinicia Sistema (Opcional)
- Executa `start`
- Aguarda 3 segundos antes de iniciar
- Inicia todos os serviços e containers

## 🎯 Opções

### --skip-logs
Não remove arquivos de log

```bash
bash scripts/maintenance/cleanup-and-restart.sh --skip-logs
```

**Quando usar:**
- Você precisa dos logs para debug
- Quer preservar histórico de execução

### --no-restart
Apenas limpa, não reinicia

```bash
bash scripts/maintenance/cleanup-and-restart.sh --no-restart
```

**Quando usar:**
- Quer apenas parar e limpar tudo
- Vai fazer manutenção manual
- Quer iniciar serviços específicos depois

### Combinando Opções

```bash
# Limpar sem remover logs e sem reiniciar
bash scripts/maintenance/cleanup-and-restart.sh --skip-logs --no-restart
```

## 📊 Exemplos de Uso

### Cenário 1: Sistema Travado

```bash
# Problema: Serviços não respondem, containers órfãos
cleanup-restart

# Resultado:
# ✓ Tudo parado (force kill)
# ✓ Containers órfãos removidos
# ✓ Sistema reiniciado
# ✓ Tudo funcionando novamente
```

### Cenário 2: Erro de Container em Uso

```bash
# Problema: "container name is already in use"
cleanup-restart

# Resultado:
# ✓ Container órfão removido
# ✓ Restart bem-sucedido
```

### Cenário 3: Debug de Problemas

```bash
# Parar tudo mas manter logs para análise
cleanup-restart --skip-logs --no-restart

# Analisar logs
cat /tmp/tradingsystem-logs/webscraper-api.log

# Depois, iniciar manualmente
start
```

### Cenário 4: Limpeza Completa

```bash
# Resetar completamente (remove logs também)
cleanup-restart

# Sistema volta ao estado inicial
```

## 🔍 Troubleshooting

### Problema: Script não encontra comandos `stop` ou `start`

**Solução:** O script tenta usar os comandos universais, mas faz fallback para scripts diretos se não encontrar.

```bash
# Instalar shortcuts primeiro
bash install-shortcuts.sh
source ~/.bashrc

# Depois executar cleanup
cleanup-restart
```

### Problema: Containers ainda em execução após cleanup

**Solução:** Executar manualmente:

```bash
# Ver containers restantes
docker ps

# Parar manualmente
docker stop $(docker ps -q)

# Remover
docker rm -f <container_name>
```

### Problema: Portas ainda em uso após cleanup

**Solução:**

```bash
# Identificar processos
lsof -i :3200

# Matar processo
kill -9 <PID>

# Ou executar cleanup novamente
cleanup-restart
```

## 📝 Logs e Output

### Estrutura do Output

```
╔═══════════════════════════════════════════════════════════════╗
║  🧹 TradingSystem - Cleanup & Restart                         ║
╚═══════════════════════════════════════════════════════════════╝

ℹ Diretório do projeto: /home/marce/projetos/TradingSystem
ℹ Limpar logs: true
ℹ Reiniciar após limpeza: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passo 1/5: Parando Todos os Serviços
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Executando: stop --force
✓ Serviços parados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passo 2/5: Removendo Containers Órfãos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Removendo container órfão: data-frontend-apps
✓   Removido: data-frontend-apps
✓ Removidos 1 container(s) órfão(s) conhecidos
✓ Nenhum container em execução

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passo 3/5: Limpando Logs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Removendo logs de: /tmp/tradingsystem-logs
✓ Removidos 15 arquivo(s) de log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passo 4/5: Verificando Limpeza
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Nenhum processo Node.js em execução
✓ Nenhum container Docker em execução
✓ Todas as portas conhecidas estão livres
✓ Sistema completamente limpo!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passo 5/5: Reiniciando Sistema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▶ Aguardando 3 segundos antes de reiniciar...
▶ Executando: start

[... output do start ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resumo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ações realizadas:
  ✓ Serviços parados (force kill)
  ✓ Containers órfãos removidos
  ✓ Logs removidos
  ✓ Sistema reiniciado

Próximos passos:
  status                  - Verificar status dos serviços
  docker ps               - Ver containers em execução

✓ Cleanup concluído em 45s!
```

## 🎯 Quando Usar Este Script

### ✅ Use quando:
- Sistema está travado ou não responde
- Erro "container name is already in use"
- Múltiplos containers órfãos
- Portas ocupadas por processos fantasma
- Quer resetar completamente o ambiente
- Após atualizações importantes
- Antes de rodar testes críticos

### ❌ Não use quando:
- Sistema está funcionando normalmente
- Precisa preservar estado atual
- Está no meio de um debug importante
- Tem transações pendentes
- Está rodando em produção (use comandos manuais)

## 📚 Scripts Relacionados

- **[stop](../../shutdown/stop-tradingsystem-full.sh)** - Para tudo (graceful ou force)
- **[start](../../startup/start-tradingsystem-full.sh)** - Inicia tudo
- **[status](../../services/status.sh)** - Verifica status
- **[diagnose](../../services/diagnose-services.sh)** - Diagnóstico de problemas

## 🔗 Integração com Comandos Universais

Este script complementa os comandos universais:

```bash
# Padrão (pode deixar órfãos)
stop
start

# Melhor (limpa órfãos automaticamente)
cleanup-restart

# Personalizado
cleanup-restart --skip-logs
```

## 📝 Notas

- **Seguro**: Só remove containers TradingSystem conhecidos
- **Rápido**: Usa force kill para máxima velocidade
- **Completo**: Verifica tudo antes de reiniciar
- **Flexível**: Opções para diferentes cenários
- **Informativo**: Output claro em cada etapa

## 🚀 Instalação no Sistema

Para tornar `cleanup-restart` disponível globalmente:

```bash
# 1. Tornar executável
chmod +x scripts/maintenance/cleanup-and-restart.sh
chmod +x cleanup-restart

# 2. Adicionar ao install-shortcuts.sh
# (já deve estar se você tem os comandos universais)

# 3. Executar instalador
bash install-shortcuts.sh

# 4. Recarregar shell
source ~/.bashrc

# 5. Usar de qualquer lugar
cleanup-restart
```

---

**Autor**: Claude Code  
**Data**: 2025-10-20  
**Versão**: 1.0.0
