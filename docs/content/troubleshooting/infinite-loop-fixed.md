---
title: "Collections Infinite Loop Fix"
slug: /troubleshooting/infinite-loop-fixed
description: "Resolution for the collection selection render loop in the dashboard."
tags:
  - troubleshooting
  - frontend
  - collections
owner: SupportOps
lastReviewed: '2025-11-02'
---
# ✅ Loop Infinito Corrigido!

## 🐛 O Problema

A tela ficava "carregando coleções" infinitamente e não liberava os modelos para seleção.

**Causa:** Loop infinito de re-renders no hook `useCollections`

O `useEffect` tinha as funções `refreshCollections` e `refreshModels` nas dependências, causando re-renders infinitos:

```typescript
// ❌ ANTES (Errado)
useEffect(() => {
  refreshCollections();
  if (loadModels) {
    refreshModels();
  }
}, [refreshCollections, refreshModels, loadModels]); // ❌ Funções nas deps
```

## ✅ A Solução

Removi as funções das dependências para executar apenas no mount:

```typescript
// ✅ AGORA (Correto)
useEffect(() => {
  refreshCollections();
  if (loadModels) {
    refreshModels();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ✅ Array vazio = só executa no mount
```

## 🚀 Como Aplicar a Correção

### 1. Reiniciar o Dashboard

O dashboard foi parado. Inicie novamente:

```bash
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
npm run dev
```

### 2. Fazer Hard Refresh

Depois que o dashboard iniciar:

```
Pressione: Ctrl + Shift + R
```

### 3. Testar

Abra: http://localhost:3103/#/rag-services

**O que deve acontecer:**
- ✅ Tela carrega rápido (sem loop infinito)
- ✅ Tabela de coleções aparece com 9 itens
- ✅ Botão "Nova Coleção" fica habilitado
- ✅ Ao clicar, dialog abre instantaneamente
- ✅ Modelos aparecem disponíveis no dropdown

---

## 📝 Arquivo Modificado

**Arquivo:** `frontend/dashboard/src/hooks/llamaIndex/useCollections.ts`

**Linha:** 303-310

**Mudança:**
```diff
   useEffect(() => {
     refreshCollections();

     if (loadModels) {
       refreshModels();
     }
-  }, [refreshCollections, refreshModels, loadModels]);
+    // eslint-disable-next-line react-hooks/exhaustive-deps
+  }, []); // Only run on mount
```

---

## 🧪 Como Verificar Se Funcionou

### 1. Console do Navegador (F12)

**Antes (com erro):**
- Múltiplas chamadas GET para `/api/v1/rag/collections` por segundo
- Mensagens de erro ou warnings
- CPU alta no processo do navegador

**Depois (corrigido):**
- Uma única chamada GET ao carregar a página
- Sem erros ou warnings
- CPU normal

### 2. Rede (F12 → Network)

**Antes:**
- Dezenas/centenas de requests repetidas
- Loading spinner infinito

**Depois:**
- 2 requests iniciais:
  - GET `/api/v1/rag/collections`
  - GET `/api/v1/rag/models`
- Loading desaparece rapidamente

### 3. Interface

**Antes:**
- Botão "Nova Coleção" desabilitado
- Mensagem "Carregando coleções..."
- Dialog nunca abre

**Depois:**
- Botão "Nova Coleção" habilitado
- Tabela renderizada com dados
- Dialog abre instantaneamente

---

## 🎯 Próximos Testes

Depois de reiniciar o dashboard:

### Teste 1: Visualizar Coleções
1. Abrir http://localhost:3103/#/rag-services
2. Scroll até "Gerenciamento de Coleções"
3. ✅ Ver tabela com 9 coleções
4. ✅ Verificar que dados carregaram

### Teste 2: Criar Nova Coleção
1. Clicar "Nova Coleção"
2. ✅ Dialog abre instantaneamente
3. ✅ Ver dropdown de modelos:
   - nomic-embed-text (384d) - Disponível
   - mxbai-embed-large (1024d) - Disponível
4. ✅ Ver campo de diretório com botão "Navegar"

### Teste 3: Navegador de Diretórios
1. Clicar botão "Navegar"
2. ✅ Lista de diretórios expande
3. ✅ Clicar em pasta para navegar
4. ✅ Clicar "Usar Este Diretório"

### Teste 4: Preencher Formulário
1. Preencher todos os campos:
   - Nome: `minha_colecao_teste`
   - Descrição: `Teste de nova coleção`
   - Modelo: Selecionar qualquer um (ambos disponíveis)
   - Diretório: Selecionar via navegador
2. ✅ Clicar "Criar Coleção"
3. ✅ Verificar que coleção aparece na tabela

---

## 🐛 Se Ainda Não Funcionar

### Verificação 1: Dashboard Rodando?
```bash
lsof -i :3103
```

Deve mostrar processo Node.js

### Verificação 2: Variável de Ambiente
No console do navegador (F12):
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
```

Deve mostrar: `"http://localhost:3402"`

### Verificação 3: APIs Respondendo?
```bash
curl http://localhost:3402/api/v1/rag/models | jq '.data.models | length'
# Esperado: 2

curl http://localhost:3402/api/v1/rag/collections | jq '.data.collections | length'
# Esperado: 9
```

### Verificação 4: Erros no Console?
Abrir F12 → Console

**Erros comuns:**
- `Failed to fetch` → Backend não está rodando
- `CORS error` → Problema de configuração
- `404 Not Found` → URL errada

Se encontrar erros, me mostre!

---

## ✅ Resumo

**Problema:** Loop infinito de re-renders no useCollections hook

**Causa:** Dependências incorretas no useEffect

**Solução:** Remover funções callback das dependências

**Arquivo Modificado:** `frontend/dashboard/src/hooks/llamaIndex/useCollections.ts`

**Próximo Passo:**
1. Reiniciar dashboard (`npm run dev`)
2. Hard refresh (`Ctrl+Shift+R`)
3. Testar funcionalidade

**Me avise quando testar!** 🚀
