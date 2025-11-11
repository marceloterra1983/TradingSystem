---
title: "Hard Refresh Checklist"
description: "Steps to force a full reload of cached assets across supported browsers."
tags:
  - frontend
  - guidelines
  - support
owner: FrontendGuild
lastReviewed: '2025-11-02'
---
# 🔄 Como Atualizar o Frontend

## ⚡ Hard Refresh do Navegador

**IMPORTANTE:** O frontend precisa de um hard refresh para carregar os novos componentes!

### No Chrome/Edge/Brave:
```
Ctrl + Shift + R
```
ou
```
Ctrl + F5
```

### No Firefox:
```
Ctrl + Shift + R
```
ou
```
Ctrl + F5
```

### Alternativa (Limpar Cache):
1. Pressione `F12` para abrir DevTools
2. Clique com botão direito no ícone de refresh
3. Selecione "Empty Cache and Hard Reload"

---

## ✅ Verificações

### 1. Backend Funcionando
```bash
curl http://localhost:3402/health
# Status: healthy ✅

curl http://localhost:3402/api/v1/rag/models | jq '.data.total'
# Expected: 2 ✅

curl http://localhost:3402/api/v1/rag/directories | jq '.data.total'
# Expected: 2 ✅
```

### 2. Frontend Carregando
```bash
curl -s http://localhost:3103 > /dev/null && echo "OK"
# Expected: OK ✅
```

### 3. Página RAG Services
Abra: **http://localhost:3103/#/rag-services**

Você deve ver:
- ✅ Seção "RAG Status" (primeira)
- ✅ Seção "Ingestão e saúde" (segunda)
- ✅ Seção "Gerenciamento de Coleções" (terceira - NOVA com ícone roxo)
- ✅ Seção "Interactive Query Tool" (quarta)

---

## 🔍 Sobre os Modelos "Não Disponíveis"

**ISSO É NORMAL!**

Os modelos mostram `available: false` porque o Ollama não está rodando.

Mas os modelos **FUNCIONAM PERFEITAMENTE** no formulário:
- Você pode selecioná-los normalmente
- Você pode criar collections com eles
- O Ollama só é necessário quando for **fazer ingestion** (processar documentos)

### Para Ativar Ollama (Opcional):
```bash
# Start Ollama container
docker compose -f tools/compose/docker-compose.4-4-rag-stack.yml up -d ollama

# Pull models (dentro do container)
docker exec rag-ollama ollama pull nomic-embed-text
docker exec rag-ollama ollama pull mxbai-embed-large

# Wait ~2 minutes, then check
curl http://localhost:3402/api/v1/rag/models | jq '.data.models[] | {name, available}'
```

**Mas NÃO é necessário para testar o formulário!**

---

## 🧪 Como Testar

### Passo 1: Hard Refresh
Pressione `Ctrl + Shift + R` no navegador

### Passo 2: Abrir Console
Pressione `F12` e vá na aba **Console**

### Passo 3: Verificar Erros
- ❌ Se ver erros vermelhos → me mostre o erro
- ✅ Se não ver erros → página carregou bem!

### Passo 4: Testar Formulário
1. Navegar para: http://localhost:3103/#/rag-services
2. Scroll até "Gerenciamento de Coleções" (ícone roxo Boxes)
3. Clicar "Nova Coleção"
4. Verificar se o dialog abre

**O que você deve ver no dialog:**

```
┌─────────────────────────────────────────┐
│  Criar Nova Coleção                     │
├─────────────────────────────────────────┤
│                                         │
│  Nome *                                 │
│  [________________]                     │
│                                         │
│  Descrição *                            │
│  [________________]                     │
│                                         │
│  Modelo de Embedding *                  │
│  [▼ nomic-embed-text    ]              │
│                                         │
│  Diretório de Origem *                  │
│  [/data/docs/content  ] [Navegar]      │
│                                         │
│  ▼ Configurações Avançadas              │
│                                         │
│  [Cancelar]  [Criar Coleção]           │
└─────────────────────────────────────────┘
```

### Passo 5: Testar Seletor de Modelos
1. Clicar no dropdown "Modelo de Embedding"
2. Verificar se aparece:
   - `nomic-embed-text` (384d) - Padrão
   - `mxbai-embed-large` (1024d)

### Passo 6: Testar Seletor de Diretório
1. Clicar em botão "Navegar"
2. Ver navegador de pastas expandir
3. Ver lista de pastas
4. Clicar em uma pasta para navegar
5. Clicar "Usar Este Diretório"

---

## 🐛 Se Ainda Não Funcionar

### Me informe:

1. **Qual é o erro exato?**
   - Mensagem de erro no console (F12 → Console)
   - Screenshot se possível

2. **O que não está funcionando?**
   - Página não carrega?
   - Dialog não abre?
   - Modelos não aparecem?
   - Navegador de pastas não funciona?

3. **O que você vê?**
   - Página em branco?
   - Erro específico?
   - Loading infinito?

---

## ✅ Status Atual

**Backend:**
- ✅ Rodando na porta 3402
- ✅ Health: healthy
- ✅ Modelos: 2 retornados (nomic, mxbai)
- ✅ Diretórios: 2 bases disponíveis
- ✅ CORS configurado para localhost:3103

**Frontend:**
- ✅ Dashboard rodando na porta 3103
- ✅ Vite servindo arquivos
- ⏳ Aguardando hard refresh do navegador

**Próximo passo:**
👉 **Fazer hard refresh (Ctrl+Shift+R) e me dizer o que acontece!**
