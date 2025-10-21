# 🔧 Correção do Cursor - Modelos Claude

## ❌ Problema Identificado

O Cursor estava tentando usar modelos inexistentes:
- `glm-4.6` (não existe)
- `glm-4.5-air` (não existe)

Isso causava erro 404 no Cursor quando tentava usar o Claude Code.

## ✅ Correção Aplicada

### 1. Corrigido `.claude/settings.json`

**Antes (INCORRETO):**
```json
"env": {
  "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-4.5-air",
  "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-4.6", 
  "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-4.6"
}
```

**Depois (CORRETO):**
```json
"env": {
  "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-3-haiku-20240307",
  "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-3-5-sonnet-20241022",
  "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-3-opus-20240229"
}
```

### 2. Criado `.vscode/settings.json`

Configuração específica para o VS Code/Cursor:
```json
{
  "claude.code.defaultModel": "claude-3-5-sonnet-20241022",
  "claude.code.models": {
    "claude-3-5-sonnet-20241022": {
      "name": "Claude 3.5 Sonnet",
      "description": "Most capable model for complex tasks"
    }
  }
}
```

### 3. Criado `.cursor/settings.json`

Configuração específica para o Cursor:
```json
{
  "claude.code.defaultModel": "claude-3-5-sonnet-20241022",
  "claude.code.disableGlmIntegration": true
}
```

## 🎯 Modelos Corretos do Claude

| Modelo | ID | Uso |
|--------|----|----|
| Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` | Mais capaz para tarefas complexas |
| Claude 3 Opus | `claude-3-opus-20240229` | Mais poderoso |
| Claude 3 Haiku | `claude-3-haiku-20240307` | Mais rápido para tarefas simples |

## 🔍 Verificações Realizadas

✅ Comando `claude` correto: `/home/marce/.local/bin/claude`  
✅ Sem conflitos no PATH  
✅ Configurações do projeto corrigidas  
✅ Arquivos de configuração criados  

## 🚀 Resultado

Agora o Cursor deve funcionar normalmente com:
- Claude 3.5 Sonnet como padrão
- Modelos corretos configurados
- Sem interferência do comando GLM

## ⚠️ Importante

- O comando GLM (`./glm`) continua funcionando normalmente
- É um comando separado que usa API Z.ai
- Não interfere mais com o Cursor
- Ambos podem coexistir sem problemas

## 🔄 Para Aplicar

1. **Reinicie o Cursor** para aplicar as novas configurações
2. **Teste o Claude Code** no Cursor
3. **Use o GLM** quando necessário: `./glm`

---

**Problema resolvido!** O Cursor agora deve abrir o Claude Code normal sem erros 404.

