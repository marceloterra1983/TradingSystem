# Sudo Scripts Directory

Este diretório contém scripts gerados automaticamente pelo Claude Code quando comandos `sudo` são necessários.

## 🔐 Por Que Isso Existe?

Claude Code **nunca deve executar comandos sudo diretamente** pois:
- Requerem senha interativa (não funciona em automação)
- Podem modificar sistema de forma irreversível
- Precisam de revisão humana por segurança

## 📋 Formato dos Scripts

Cada script é nomeado com timestamp:
```
sudo_YYYYMMDD_HHMMSS.sh
```

Acompanhado de arquivo de prompt:
```
PROMPT_YYYYMMDD_HHMMSS.txt
```

## 🚀 Como Usar

### 1. Claude Code Detecta Sudo

Quando Claude Code identifica necessidade de `sudo`, ele:
1. ✅ Cria script automaticamente
2. ✅ Mostra localização e conteúdo
3. ✅ Aguarda sua confirmação
4. ❌ **NÃO executa** o comando

### 2. Você Revisa e Executa

```bash
# Revisar o script
cat .claude/sudo-scripts/sudo_20251109_143022.sh

# Executar se aprovado
sudo bash .claude/sudo-scripts/sudo_20251109_143022.sh

# Confirmar execução no chat do Claude Code
# Claude Code continuará o workflow
```

### 3. Exemplos de Uso

#### Exemplo 1: Instalação de Pacote

**Claude Code detecta:**
```bash
sudo apt-get install postgresql-client
```

**Cria script:**
```bash
.claude/sudo-scripts/sudo_20251109_143022.sh
```

**Conteúdo:**
```bash
#!/bin/bash
# Auto-generated sudo script by Claude Code

echo "Installing PostgreSQL client..."
sudo apt-get update
sudo apt-get install -y postgresql-client
echo "✅ Installation complete"
```

**Você executa:**
```bash
sudo bash .claude/sudo-scripts/sudo_20251109_143022.sh
```

#### Exemplo 2: Configuração de Permissões

**Claude Code detecta:**
```bash
sudo chown -R $USER:$USER /var/log/trading
```

**Cria script:**
```bash
.claude/sudo-scripts/sudo_20251109_143530.sh
```

**Você revisa e executa**

## 📊 Logs

Todas as interceptações são logadas em:
```
.claude/logs/sudo-intercepts.log
```

Formato:
```
[YYYY-MM-DD HH:MM:SS] SUDO intercepted: [command] → [script-path]
```

## 🧹 Limpeza

Scripts acumulam ao longo do tempo. Para limpar:

```bash
# Listar scripts antigos
ls -lh .claude/sudo-scripts/

# Remover scripts com 30+ dias
find .claude/sudo-scripts -name "sudo_*.sh" -mtime +30 -delete
find .claude/sudo-scripts -name "PROMPT_*.txt" -mtime +30 -delete

# Remover todos os scripts (cuidado!)
rm -f .claude/sudo-scripts/sudo_*.sh
rm -f .claude/sudo-scripts/PROMPT_*.txt
```

## 🔒 Segurança

### ✅ Boas Práticas

1. **SEMPRE revise** o script antes de executar
2. **Entenda** cada comando no script
3. **Teste** em ambiente de desenvolvimento primeiro
4. **Documente** modificações que fizer nos scripts

### ⚠️ Nunca Execute Se

- ❌ Não entender o que o script faz
- ❌ Ver comandos suspeitos (`rm -rf /`, `chmod 777 /etc`)
- ❌ Script modificar arquivos de sistema críticos sem justificativa
- ❌ Não confiar na origem do script

### 🛡️ Auditoria

```bash
# Ver histórico de scripts criados
cat .claude/logs/sudo-intercepts.log

# Ver último script criado
ls -lt .claude/sudo-scripts/sudo_*.sh | head -1

# Verificar integridade (checksum)
sha256sum .claude/sudo-scripts/sudo_*.sh > .claude/sudo-scripts/checksums.txt
```

## 🔧 Customização

### Adicionar Validação Extra

Edite o script após criação e antes de executar:

```bash
# Abrir no editor
nano .claude/sudo-scripts/sudo_20251109_143022.sh

# Adicionar validações
if ! command -v postgresql &> /dev/null; then
    echo "PostgreSQL not found, safe to install"
fi

# Adicionar rollback
trap 'echo "Error occurred, rolling back..."' ERR
```

### Template Customizado

Para projetos específicos, crie template em:
```
.claude/helpers/sudo-template.sh
```

Claude Code usará como base se existir.

## 📚 Integração com Workflow

O processo completo:

```
1. Claude Code identifica sudo
   ↓
2. Hook PreToolUse intercepta
   ↓
3. Script gerado automaticamente
   ↓
4. Claude Code mostra prompt
   ↓
5. Você revisa e executa
   ↓
6. Você confirma no chat
   ↓
7. Claude Code continua workflow
```

## 🆘 Troubleshooting

### Problema: Script não criado

**Causa:** Hook não configurado corretamente

**Solução:**
```bash
# Verificar hooks
cat .claude/settings.json | jq '.hooks.PreToolUse'

# Verificar permissões
ls -la .claude/helpers/sudo-interceptor.sh
```

### Problema: Script sem permissão de execução

**Solução:**
```bash
chmod +x .claude/sudo-scripts/sudo_*.sh
```

### Problema: Comando sudo ainda executa diretamente

**Causa:** Hook não está sendo executado

**Solução:**
1. Reiniciar sessão Claude Code
2. Verificar logs: `cat .claude/logs/bash-commands.log`
3. Verificar se hook está ativo: `.claude/settings.json`

## 📖 Referências

- **Automation Guide:** `.claude/AUTOMATION-GUIDE.md`
- **Settings:** `.claude/settings.json`
- **Sudo Interceptor:** `.claude/helpers/sudo-interceptor.sh`

---

**Última atualização:** 2025-11-09
**Versão:** 1.0.0
