# 🔍 Debug: RAG Services Page

**URL:** http://localhost:3103/#/rag-services
**Status:** Investigando erro reportado
**Data:** 2025-10-31 21:00

---

## ✅ Verificações de Infraestrutura

### Backend Services (Todas OK)

```bash
✅ Dashboard: Running on port 3103
✅ RAG Collections Service: Up and healthy (port 3402)
✅ Ollama: Up and healthy (port 11434)
✅ LlamaIndex Ingestion: Up and healthy (port 8201)
✅ LlamaIndex Query: Up and healthy (port 8202)
```

### API Endpoints (Todas Respondendo)

```bash
✅ GET /api/v1/rag/collections - OK (9 collections)
✅ GET /api/v1/rag/models - OK (2 models)
✅ GET /api/v1/rag/directories - OK
✅ GET /health - OK (healthy)
```

---

## 🐛 Problema Identificado

### Loop Infinito no useCollections Hook

**Arquivo:** `frontend/dashboard/src/hooks/llamaIndex/useCollections.ts`

**Causa:** useEffect com dependências incorretas causava re-renders infinitos

**Sintomas:**
- Tela fica "carregando coleções" indefinidamente
- Modelos não ficam disponíveis para seleção
- CPU alta no navegador
- Múltiplas requisições HTTP repetidas

### Correção Aplicada

```typescript
// ❌ ANTES (linha 303-309)
useEffect(() => {
  refreshCollections();
  if (loadModels) {
    refreshModels();
  }
}, [refreshCollections, refreshModels, loadModels]); // ❌ Causa loop

// ✅ DEPOIS
useEffect(() => {
  refreshCollections();
  if (loadModels) {
    refreshModels();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // ✅ Executa só no mount
```

---

## 🧪 Como Testar a Correção

### 1. Verificar APIs (Via curl)

```bash
# Modelos
curl http://localhost:3402/api/v1/rag/models | jq '.data.models[] | {name, available}'

# Coleções
curl http://localhost:3402/api/v1/rag/collections | jq '.data.total'

# Diretórios
curl http://localhost:3402/api/v1/rag/directories | jq '.data.total'
```

**Resultado Esperado:**
- 2 modelos (ambos available: true)
- 9 coleções
- Lista de diretórios permitidos

### 2. Verificar APIs (Via Navegador)

Abrir: **http://localhost:3103/test-rag-api.html**

**O que deve aparecer:**
- ✅ Health Check - OK
- ✅ Models API - OK (2 models)
- ✅ Collections API - OK (9 collections)
- ✅ Directories API - OK

Se algum endpoint falhar, há problema de CORS ou backend.

### 3. Testar Página RAG Services

Abrir: **http://localhost:3103/#/rag-services**

**Hard Refresh:** `Ctrl + Shift + R`

**Checklist Visual:**

1. **Primeira Seção - "RAG Status"**
   - [ ] Badge de status (verde/vermelho)
   - [ ] Informações de modo (Proxy/Direct/Auto)
   - [ ] Health check visual

2. **Segunda Seção - "Ingestão e Saúde"**
   - [ ] Status dos serviços
   - [ ] Métricas de documentos

3. **Terceira Seção - "Gerenciamento de Coleções"** ⭐ NOVA
   - [ ] Ícone roxo (Boxes)
   - [ ] Botão "Nova Coleção" habilitado
   - [ ] Tabela com 9 linhas (coleções)
   - [ ] Cada linha mostra: nome, descrição, diretório, modelo, ações

4. **Quarta Seção - "Interactive Query Tool"**
   - [ ] Campo de busca
   - [ ] Botão de query

### 4. Testar Criação de Coleção

1. Clicar "Nova Coleção"
2. **Verificar dialog:**
   - [ ] Dialog abre instantaneamente (sem lag)
   - [ ] Campo "Nome" vazio
   - [ ] Campo "Descrição" vazio
   - [ ] Dropdown "Modelo de Embedding" mostra:
     - `nomic-embed-text (384d)` - Badge verde "Disponível"
     - `mxbai-embed-large (1024d)` - Badge verde "Disponível"
   - [ ] Campo "Diretório" com valor padrão
   - [ ] Botão "Navegar" visível

3. **Testar Navegador de Diretórios:**
   - Clicar "Navegar"
   - [ ] Lista de diretórios expande
   - [ ] Ver pastas: api/, apps/, database/, frontend/, etc.
   - [ ] Clicar em pasta navega para dentro
   - [ ] Botão "⬆️ Subir um nível" funciona
   - [ ] Clicar "Usar Este Diretório" fecha navegador

4. **Preencher Formulário:**
   - Nome: `teste_colecao`
   - Descrição: `Coleção de teste`
   - Modelo: Selecionar qualquer um
   - Diretório: Selecionar via navegador
   - Clicar "Criar Coleção"

5. **Verificar Resultado:**
   - [ ] Dialog fecha
   - [ ] Nova coleção aparece na tabela
   - [ ] Total de coleções aumentou para 10

---

## 🐛 Diagnóstico de Erros Comuns

### Erro 1: "Carregando coleções..." infinito

**Causa:** Loop de re-renders no useCollections hook

**Solução:** Já corrigida em `useCollections.ts`

**Como verificar se está corrigido:**
- Abrir Console (F12)
- Aba Network
- Não deve haver múltiplas chamadas repetidas para `/api/v1/rag/collections`
- Deve haver apenas 2 requests iniciais (collections + models)

### Erro 2: Modelos aparecem como "Indisponíveis"

**Causa:** Ollama não está rodando

**Verificar:**
```bash
docker ps --filter "name=rag-ollama"
curl http://localhost:11434/api/tags
```

**Solução:**
```bash
docker compose -f tools/compose/docker-compose.rag.yml up -d ollama
docker exec rag-ollama ollama pull nomic-embed-text
docker exec rag-ollama ollama pull mxbai-embed-large
```

### Erro 3: Erro 404 nas APIs

**Causa:** Porta errada ou backend não rodando

**Verificar variável de ambiente:**
```javascript
// No console do navegador (F12)
console.log(import.meta.env.VITE_API_BASE_URL)
// Deve mostrar: "http://localhost:3402"
```

**Se mostrar porta diferente:**
```bash
# Corrigir .env
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
echo "VITE_API_BASE_URL=http://localhost:3402" >> .env

# Reiniciar dashboard
# Ctrl+C no terminal
npm run dev
```

### Erro 4: CORS Error

**Causa:** Backend não permite requisições do frontend

**Verificar logs do backend:**
```bash
docker logs rag-collections-service | grep CORS
```

**Solução:**
Backend já está configurado para aceitar `http://localhost:3103`

Se ainda houver erro, verificar se frontend está na porta correta.

### Erro 5: Dialog não abre

**Causa:** Erro JavaScript ou componente não carregou

**Verificar Console (F12):**
- Procurar erros em vermelho
- Mensagens de "Cannot read property" ou "undefined"

**Componentes necessários:**
- CollectionsManagementCard
- CollectionFormDialog
- EmbeddingModelSelector
- DirectorySelector
- Table, DropdownMenu, Switch

Se algum estiver faltando, há problema de importação.

### Erro 6: Navegador de diretórios não funciona

**Causa:** API de diretórios não responde ou erro de permissão

**Testar API:**
```bash
curl "http://localhost:3402/api/v1/rag/directories/browse?path=/data/docs/content"
```

**Se retornar erro 403 ou 404:**
- Path não está na whitelist
- Container não tem acesso ao volume montado

**Verificar volumes:**
```bash
docker inspect rag-collections-service | jq '.[0].Mounts'
```

---

## 📊 Checklist de Saúde do Sistema

### Backend
- [x] Container `rag-collections-service` - Healthy
- [x] Container `rag-ollama` - Healthy
- [x] Container `rag-llamaindex-ingest` - Healthy
- [x] Container `rag-llamaindex-query` - Healthy
- [x] API `/api/v1/rag/models` - Respondendo
- [x] API `/api/v1/rag/collections` - Respondendo
- [x] API `/api/v1/rag/directories` - Respondendo

### Frontend
- [x] Dashboard rodando (porta 3103)
- [x] Variável VITE_API_BASE_URL correta (3402)
- [x] Hook useCollections corrigido
- [ ] Página testada pelo usuário ← **PRÓXIMO PASSO**

---

## 🚀 Próximos Passos

1. **Abrir a página:** http://localhost:3103/#/rag-services
2. **Fazer hard refresh:** `Ctrl + Shift + R`
3. **Abrir Console:** `F12` → Console
4. **Verificar erros:** Procurar mensagens em vermelho
5. **Testar funcionalidade:**
   - Ver tabela de coleções
   - Clicar "Nova Coleção"
   - Selecionar modelo
   - Navegar diretórios
   - Criar coleção
6. **Reportar resultado:**
   - Se funcionar: Tudo OK!
   - Se falhar: Copiar mensagem de erro exata do console

---

## 📝 Logs Úteis

### Ver logs do container
```bash
docker logs rag-collections-service --tail 50
```

### Ver logs do dashboard (Vite)
```bash
# No terminal onde está rodando npm run dev
# Ver output direto
```

### Ver requisições HTTP
```bash
# No navegador (F12)
# Aba Network
# Filtrar por "rag" ou "3402"
```

---

## 🆘 Se Ainda Não Funcionar

**Me envie:**

1. **Screenshot da página** (mostrando o erro visual)
2. **Mensagens do Console** (F12 → Console, copiar erros em vermelho)
3. **Aba Network** (F12 → Network, filtrar "3402", mostrar requests falhando)
4. **Output destes comandos:**
   ```bash
   docker ps --filter "name=rag"
   curl http://localhost:3402/api/v1/rag/models
   curl http://localhost:3402/api/v1/rag/collections
   ```

Com essas informações conseguirei identificar exatamente o que está acontecendo.
