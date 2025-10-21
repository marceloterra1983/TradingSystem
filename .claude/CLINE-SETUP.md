# 🔓 Cline (Claude Dev) - Configuração de Permissões Completas

Guia para configurar o **Cline** (anteriormente Claude Dev/Codex) com permissões completas no TradingSystem.

## 📋 O Que É Cline?

**Cline** (anteriormente Claude Dev) é a extensão do VSCode/Cursor que integra Claude AI diretamente no editor.

-   **Extensão**: `saoudrizwan.claude-dev`
-   **Interface**: Painel lateral no Cursor/VSCode
-   **Funcionalidade**: Chat + código + terminal integrado

## ✅ Arquivos Criados

Configuração completa para Cline foi criada:

1. **`.clinerules`** (3.8 KB)

    - Regras e permissões do projeto
    - Segue guidelines do CLAUDE.md
    - Modo de desenvolvimento ativo

2. **`.vscode/settings.json`** (2.5 KB)
    - Configurações do projeto
    - Auto-approve habilitado
    - MCP servers configurados

## 🔧 Configuração Manual (Requerida)

**⚠️ Importante**: Cline requer configuração manual na interface do Cursor!

### Passo 1: Abrir Configurações do Cline

1. Abrir **Cursor/VSCode**
2. Clicar no ícone do **Cline** no painel lateral (ou `Ctrl+Shift+P` → "Cline")
3. Clicar no ícone de **engrenagem** ⚙️ no painel do Cline
4. Ou: `Ctrl+Shift+P` → "Cline: Open Settings"

### Passo 2: Configurar Permissões Automáticas

Na interface de settings do Cline, configure:

#### Auto-Approve (Aprovação Automática)

```
☑️ Auto-approve read operations
☑️ Auto-approve write operations
☑️ Auto-approve command execution
☑️ Always allow readonly operations
```

#### Experimental Features

```
☑️ Enable custom instructions
☑️ Enable MCP servers
☑️ Enable advanced tools
```

### Passo 3: Configurar Custom Instructions

No campo "Custom Instructions" do Cline, adicionar:

```
Follow all guidelines from CLAUDE.md and .clinerules.
Use Brazilian Portuguese (ptbr) unless explicitly asked otherwise.
Auto-approve all operations in development mode.
```

### Passo 4: Configurar MCP Servers (Opcional)

Se a configuração de `.vscode/settings.json` não funcionar automaticamente:

1. Abrir settings do Cline
2. Ir para aba "MCP Servers"
3. Adicionar servers manualmente (já configurados no settings.json)

### Passo 5: Verificar Configuração

1. Abrir um arquivo no projeto
2. Pedir ao Cline para ler/editar algo
3. **Verificar se NÃO pede confirmação**
4. Se pedir, revisar settings acima

## 📁 Arquivos de Configuração

### `.clinerules` (Raiz do Projeto)

Arquivo principal de configuração com:

-   ✅ Regras do projeto
-   ✅ Permissões (full access)
-   ✅ Custom commands disponíveis
-   ✅ MCP servers
-   ✅ Workflow guidelines
-   ✅ Security notes

**Lido automaticamente** pelo Cline quando carrega o projeto.

### `.vscode/settings.json`

Configurações do projeto para Cursor/VSCode:

-   ✅ `cline.autoApprove: true`
-   ✅ MCP servers configurados
-   ✅ Editor settings
-   ✅ Git settings
-   ✅ Language-specific settings

**Aplicado automaticamente** ao abrir o projeto.

### MCP Settings (Global)

Localização: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

Já configurado com 7 MCP servers:

1. fs-wsl
2. git-tradingsystem
3. fetch
4. memory
5. sequential-thinking
6. time
7. everything

## 🚀 Como Usar

### Modo Normal (Com Cline no Cursor)

1. Abrir Cursor
2. Abrir projeto TradingSystem
3. Abrir painel do Cline (ícone na barra lateral)
4. Conversar normalmente - **sem confirmações!**

### Comandos Custom Disponíveis

Dentro do chat do Cline, você pode usar:

```
/health-check all
/service-launcher status
/docker-compose start-all
/git-workflows status
/scripts validate-env
```

**Nota**: Cline executará automaticamente sem pedir confirmação!

### Exemplo de Uso

```
Você: "Check the health of all services"
Cline: *executa automaticamente* ✅ Dashboard running...

Você: "Start the dashboard service"
Cline: *inicia serviço automaticamente* ✅ Started on port 3103

Você: "Create a new component Button.tsx"
Cline: *cria arquivo automaticamente* ✅ Created Button.tsx
```

## 🔓 Diferenças: Cline vs Claude Code

| Feature             | Cline         | Claude Code CLI     |
| ------------------- | ------------- | ------------------- |
| **Interface**       | GUI (Cursor)  | Terminal            |
| **Permissões**      | Config manual | `.claude-plugin`    |
| **Auto-approve**    | Via settings  | Via flags           |
| **MCP Servers**     | settings.json | `~/.claude.json`    |
| **Custom Commands** | .clinerules   | `.claude/commands/` |
| **Uso**             | IDE integrado | CLI standalone      |

## ⚙️ Verificação de Configuração

### Checklist

-   [ ] `.clinerules` criado na raiz do projeto
-   [ ] `.vscode/settings.json` criado
-   [ ] Cline settings aberto no Cursor
-   [ ] Auto-approve habilitado
-   [ ] Custom instructions configuradas
-   [ ] MCP servers carregados
-   [ ] Testado sem confirmações

### Comando de Teste

No Cline, envie:

```
Read the .clinerules file and confirm auto-approve is active
```

**Esperado**: Cline lê o arquivo e confirma permissões ativas **SEM pedir confirmação**.

## ⚠️ Segurança

### ✅ FAÇA

-   Use em desenvolvimento local
-   Tenha Git configurado (backups)
-   Revise mudanças importantes
-   Alterne para modo seguro quando necessário

### ❌ NÃO FAÇA

-   NÃO use com dados sensíveis
-   NÃO use em produção
-   NÃO ignore avisos
-   NÃO trabalhe sem backups

### Desabilitar Permissões

Para voltar ao modo seguro:

1. **Opção 1 - Settings do Cline**:

    - Abrir settings
    - Desmarcar auto-approve
    - Salvar

2. **Opção 2 - Editar .vscode/settings.json**:

    ```json
    {
        "cline.autoApprove": false,
        "cline.approval.read": true,
        "cline.approval.write": true,
        "cline.approval.execute": true
    }
    ```

3. **Opção 3 - Remover .clinerules**:
    ```bash
    mv .clinerules .clinerules.backup
    ```

## 🆘 Troubleshooting

### Cline ainda pede confirmação

**Causa**: Settings não aplicadas

**Solução**:

1. Verificar `.vscode/settings.json` existe
2. Recarregar Cursor (`Ctrl+Shift+P` → "Reload Window")
3. Verificar settings do Cline manualmente
4. Confirmar `cline.autoApprove: true`

### .clinerules não sendo lido

**Causa**: Arquivo não na raiz do projeto

**Verificar**:

```bash
ls -la .clinerules
# Deve estar em /home/marce/projetos/TradingSystem/.clinerules
```

### MCP servers não funcionando

**Causa**: Configuração não carregada

**Solução**:

1. Abrir settings do Cline
2. Aba "MCP Servers"
3. Verificar se servers aparecem
4. Recarregar se necessário

### Permissões não funcionando

**Causa**: Configuração incorreta

**Reset completo**:

```bash
# 1. Verificar arquivos
ls -la .clinerules .vscode/settings.json

# 2. Recarregar Cursor
# Ctrl+Shift+P → "Reload Window"

# 3. Abrir settings do Cline
# Verificar auto-approve

# 4. Testar
# Pedir ao Cline para ler um arquivo
```

## 📚 Documentação Relacionada

-   **Configuração Claude Code**: [`.claude/PERMISSIONS-GUIDE.md`](PERMISSIONS-GUIDE.md)
-   **Quick Reference**: [`.claude/QUICK-REFERENCE.md`](QUICK-REFERENCE.md)
-   **Main Guidelines**: [`../CLAUDE.md`](../CLAUDE.md)
-   **Project Structure**: [`../docs/DIRECTORY-STRUCTURE.md`](../docs/DIRECTORY-STRUCTURE.md)

## 📊 Comparação de Ferramentas

| Ferramenta          | Interface    | Permissões        | Setup                            | Uso Recomendado                       |
| ------------------- | ------------ | ----------------- | -------------------------------- | ------------------------------------- |
| **Cline**           | GUI (Cursor) | Manual + settings | Este guia                        | IDE integrado, desenvolvimento visual |
| **Claude Code CLI** | Terminal     | `.claude-plugin`  | `.claude/`                       | Scripts, automação, terminal          |
| **Ambos**           | -            | Compartilham MCP  | `.clinerules` + `.claude-plugin` | Máxima produtividade                  |

## 🎊 Status

✅ **`.clinerules` criado** (3.8 KB)  
✅ **`.vscode/settings.json` criado** (2.5 KB)  
✅ **MCP servers configurados** (7 servers)  
⏳ **Configuração manual pendente** (via Cursor UI)  
✅ **Documentação completa** (este guia)

---

## 🚀 Próximos Passos

1. **[OBRIGATÓRIO]** Configurar via Cursor UI:

    - Abrir settings do Cline
    - Habilitar auto-approve
    - Adicionar custom instructions

2. **[RECOMENDADO]** Testar configuração:

    - Pedir ao Cline para ler arquivo
    - Verificar se NÃO pede confirmação

3. **[ÚTIL]** Ler este guia:
    ```bash
    cat .claude/CLINE-SETUP.md
    ```

---

**Configuração criada**: 18 de outubro de 2025  
**Modo**: Desenvolvimento (Full Permissions)  
**Status**: ⏳ Aguardando setup manual no Cursor







