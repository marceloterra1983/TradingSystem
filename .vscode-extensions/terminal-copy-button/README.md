# Terminal Copy Button Extension

Extension para Cursor/VSCode que adiciona um botão na barra de status para copiar o último comando e output do terminal.

## Recursos

- ✅ Botão na barra de status (canto inferior direito)
- ✅ Atalho de teclado `Alt+Q` quando terminal está em foco
- ✅ Ícone de cópia visível
- ✅ Múltiplos métodos de captura
- ✅ Formatação automática em markdown

## Instalação

### Método 1: Instalação Local (Recomendado)

1. **Copiar extensão para diretório de extensões do Cursor:**

```bash
# Linux/WSL
mkdir -p ~/.cursor/extensions
cp -r .vscode-extensions/terminal-copy-button ~/.cursor/extensions/

# Windows (PowerShell)
mkdir -Force "$env:USERPROFILE\.cursor\extensions\terminal-copy-button"
Copy-Item -Recurse ".vscode-extensions\terminal-copy-button\*" "$env:USERPROFILE\.cursor\extensions\terminal-copy-button\"
```

2. **Recarregar Cursor:**
   - Press `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac)
   - Digite: `Developer: Reload Window`
   - Enter

### Método 2: Workspace Extension

A extensão já está no diretório `.vscode-extensions/` do projeto. Para ativá-la:

1. Abra as configurações do workspace (`.vscode/settings.json`)
2. Adicione:

```json
{
  "extensions.autoUpdate": false,
  "extensions.experimental.affinity": {
    "terminal-copy-button": 1
  }
}
```

3. Recarregue o Cursor

## Uso

### ⌨️ Via Atalho de Teclado (Mais Rápido!)

1. Clique no terminal para dar foco
2. Pressione `Alt+Q`
3. Escolha o método de captura
4. ✓ Conteúdo copiado!

### 🖱️ Via Botão da Barra de Status

1. Clique no botão **"📋 Copy Terminal"** no canto inferior direito
2. Escolha o método de captura:
   - **Capture Selection**: Copia texto selecionado no terminal
   - **Capture Visible Area**: Imprime histórico e instrui a capturar
   - **Manual Paste**: Permite colar manualmente

### 🎯 Via Command Palette

1. Press `Ctrl+Shift+P` (ou `Cmd+Shift+P`)
2. Digite: `Copy Last Terminal Command and Output`
3. Enter

## Métodos de Captura

### 1. Capture Selection (Mais Rápido)

- Selecione o texto no terminal com o mouse
- Clique no botão
- Escolha "Capture Selection"
- ✓ Texto copiado com formatação markdown

### 2. Capture Visible Area (Para Histórico)

- Clique no botão
- Escolha "Capture Visible Area"
- O terminal exibirá o último comando executado
- Selecione o output visível
- Execute "Capture Selection"

### 3. Manual Paste (Fallback)

- Copie manualmente do terminal
- Clique no botão
- Escolha "Manual Paste"
- Cole o conteúdo
- ✓ Formatado automaticamente

## Formato do Output

O output é copiado no formato:

```markdown
# Terminal Output
\`\`\`bash
comando executado
output linha 1
output linha 2
...
\`\`\`
```

Isso permite colar diretamente em:
- Issues do GitHub
- Pull Requests
- Documentação Markdown
- Chat/Slack/Discord

## Limitações do VSCode API

⚠️ **Importante**: A API do VSCode não expõe diretamente o conteúdo do terminal por razões de segurança.

**Workarounds implementados:**
1. Captura via seleção manual (mais confiável)
2. Uso de `fc -ln -1` para mostrar último comando (bash/zsh)
3. Input box para paste manual

**Alternativa futura**: Se precisar de captura automática real, considere:
- Usar `script` command para gravar sessões
- Logs de comandos via `.bashrc`/`.zshrc`
- Integração com tmux/screen

## ⌨️ Atalhos de Teclado

### Atalho Padrão (Já Configurado)

**`Alt+Q`** - Copia o conteúdo do terminal quando o terminal está em foco

Este atalho já vem pré-configurado na extensão! Basta ter o terminal em foco e pressionar `Alt+Q`.

### Personalizar Atalho (Opcional)

Se quiser usar outra combinação, edite `.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+c",
    "command": "terminalCopyButton.copyLastOutput",
    "when": "terminalFocus"
  }
]
```

**Nota**: No Windows/Linux use `ctrl`, no Mac use `cmd`.

## Desenvolvimento

### Estrutura

```
.vscode-extensions/terminal-copy-button/
├── package.json       # Metadados da extensão
├── extension.js       # Código principal
└── README.md         # Esta documentação
```

### Debugging

1. Abra a pasta da extensão no Cursor
2. Press `F5` para abrir Extension Development Host
3. Teste a extensão na nova janela

### Logs

Ver logs da extensão:
1. `Ctrl+Shift+P` → `Developer: Show Logs`
2. Selecione `Extension Host`

## Troubleshooting

### Botão não aparece

1. Verifique se a extensão está ativada:
   - `Ctrl+Shift+P` → `Extensions: Show Installed Extensions`
   - Procure por "Terminal Copy Button"

2. Recarregue a janela:
   - `Ctrl+Shift+P` → `Developer: Reload Window`

### Comando não copia nada

1. Certifique-se de que há um terminal ativo
2. Selecione o texto manualmente antes de usar "Capture Selection"
3. Use "Manual Paste" como fallback

### Erro ao instalar

1. Verifique permissões do diretório `~/.cursor/extensions`
2. Tente fechar completamente o Cursor e reabrir
3. Verifique logs: `Ctrl+Shift+P` → `Developer: Toggle Developer Tools`

## Contribuindo

Para melhorias:

1. Edite `extension.js`
2. Teste com `F5`
3. Commit as mudanças

## Licença

MIT - Uso livre no projeto TradingSystem

## Changelog

### v1.0.0 (2025-10-22)
- ✨ Botão inicial na barra de status
- ✨ Atalho de teclado `Alt+Q` integrado
- ✨ Três métodos de captura
- ✨ Formatação markdown automática
- ✨ Tooltip informativo
- ✨ Funciona quando terminal está em foco
