# 🧪 TESTE AGORA: Dialog de Nova Coleção

**Adicionei logs de debug para identificar o problema!**

---

## 📋 Como Testar (PASSO A PASSO)

### 1. Abrir Página e Console

1. **Abrir URL:** http://localhost:3103/#/rag-services
2. **Abrir DevTools:** Pressionar `F12`
3. **Ir para aba Console**
4. **Fazer Hard Refresh:** `Ctrl + Shift + R`

### 2. Verificar Logs Iniciais

**No console, você deve ver:**

```
🔍 [CollectionsManagementCard] Render: {
  dialogOpen: false,
  dialogMode: "create",
  modelsCount: 2,        ← IMPORTANTE: deve ser 2
  collectionsCount: 9,   ← IMPORTANTE: deve ser 9
  isLoading: false,
  error: null
}
```

**Se ver `modelsCount: 0`:**
- ❌ Problema: Modelos não carregaram
- Ver próxima seção "Problema 1"

**Se ver `modelsCount: 2`:**
- ✅ OK! Continue

### 3. Clicar no Botão "Nova Coleção"

1. Scroll até seção "Gerenciamento de Coleções"
2. Localizar botão "Nova Coleção" (canto superior direito)
3. **CLICAR** no botão
4. **OBSERVAR O CONSOLE** imediatamente

### 4. Verificar Logs ao Clicar

**Você DEVE ver:**

```
🟢 [CollectionsManagementCard] handleCreate called
🟢 [CollectionsManagementCard] models: [...]
🟢 [CollectionsManagementCard] isLoading: false
🟢 [CollectionsManagementCard] Setting dialogOpen to true
🔍 [CollectionsManagementCard] Render: {
  dialogOpen: true,     ← MUDOU PARA TRUE!
  ...
}
🔍 [CollectionFormDialog] Props: {
  open: true,           ← DEVE SER TRUE!
  mode: "create",
  modelsCount: 2,
  hasCollection: false,
  isLoading: false
}
```

**Se NÃO ver esses logs:**
- ❌ Problema: Botão não está chamando handleCreate
- Ver seção "Problema 2"

**Se ver os logs mas dialog não abre:**
- ❌ Problema: Dialog não renderiza
- Ver seção "Problema 3"

---

## 🐛 Problemas e Soluções

### Problema 1: Modelos Não Carregaram (`modelsCount: 0`)

**Console mostra:**
```
modelsCount: 0
```

**Causa:** API não respondeu ou erro de rede

**Verificar:**
1. Abrir aba **Network** (F12)
2. Filtrar por "models"
3. Procurar: `GET /api/v1/rag/models`

**Se request falhou:**
- Status 404: Backend não está rodando
- Status 500: Erro no backend
- Failed to fetch: Problema de rede/CORS

**Solução:**
```bash
# Verificar se backend está rodando
curl http://localhost:3402/api/v1/rag/models | jq '.'

# Se não responder, reiniciar backend
docker restart rag-collections-service
```

---

### Problema 2: Botão Não Chama `handleCreate`

**Console NÃO mostra:**
```
🟢 [CollectionsManagementCard] handleCreate called
```

**Causa:** Evento onClick não está vinculado

**Verificar:**
1. Inspecionar botão (F12 → Elements)
2. Localizar: `<button>Nova Coleção</button>`
3. Verificar atributos:
   - Tem `disabled`?
   - Tem classe de desabilitado?

**Solução temporária - TESTE:**

Adicionar botão de teste direto no código:

```tsx
// Em LlamaIndexPage.tsx, adicionar temporariamente:
<button
  onClick={() => alert('Teste funciona!')}
  style={{ position: 'fixed', top: '100px', right: '10px', zIndex: 9999, background: 'red', color: 'white', padding: '10px' }}
>
  TESTE BOTÃO
</button>
```

Se esse botão funcionar: problema é específico do botão "Nova Coleção"

---

### Problema 3: Dialog Não Renderiza (Mas Estado Muda)

**Console mostra:**
```
🔍 [CollectionFormDialog] Props: { open: true, ... }
```

**Mas dialog não aparece na tela!**

**Causas possíveis:**
1. CSS está ocultando
2. z-index muito baixo
3. Componente Dialog com erro

**Verificar:**

1. **Inspecionar Elementos (F12 → Elements)**
   - Procurar por: `[role="dialog"]` ou `[data-state="open"]`
   - Se encontrar: dialog existe, mas está oculto
   - Se NÃO encontrar: componente não renderiza

2. **Se encontrou mas está oculto:**
   - Ver estilos CSS aplicados:
     - `display: none` ← Problema CSS
     - `opacity: 0` ← Problema CSS
     - `z-index: -1` ← Problema z-index

3. **Se NÃO encontrou:**
   - Erro no componente Dialog
   - Ver console para erros React

**Solução CSS:**
```tsx
// Forçar estilos inline (teste temporário)
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent style={{ zIndex: 99999, display: 'block' }}>
    {/* ... */}
  </DialogContent>
</Dialog>
```

---

### Problema 4: Erro JavaScript no Console

**Console mostra erro em vermelho:**

```
Error: Cannot read property 'X' of undefined
```

ou

```
TypeError: X is not a function
```

**O que fazer:**
1. **Copiar mensagem de erro COMPLETA**
2. **Copiar stack trace** (linhas abaixo do erro)
3. **Me enviar** para análise

---

## 📸 O que Me Enviar

Se o problema persistir, envie screenshot de:

### 1. Console Completo
- Mostrar TODOS os logs (inclusive os 🔍 e 🟢)
- Mostrar erros em vermelho se houver

### 2. Aba Network
- Filtrar por "rag"
- Mostrar requests:
  - `GET /api/v1/rag/collections`
  - `GET /api/v1/rag/models`
- Mostrar status codes

### 3. Elements Inspector
- Procurar por `[role="dialog"]`
- Mostrar se encontrou ou não
- Se encontrou, mostrar estilos CSS aplicados

---

## ✅ Se Tudo Funcionar

**Console deve mostrar:**
```
🟢 [CollectionsManagementCard] handleCreate called
🟢 [CollectionsManagementCard] models: [Array(2)]
🟢 [CollectionsManagementCard] isLoading: false
🟢 [CollectionsManagementCard] Setting dialogOpen to true
🔍 [CollectionsManagementCard] Render: { dialogOpen: true, ... }
🔍 [CollectionFormDialog] Props: { open: true, ... }
```

**E na tela:**
- ✅ Dialog abre
- ✅ Formulário aparece
- ✅ Campos editáveis
- ✅ Modelos disponíveis no dropdown

---

## 🚀 Teste AGORA!

1. Recarregar página: `Ctrl + Shift + R`
2. Abrir console: `F12`
3. Clicar "Nova Coleção"
4. Me enviar o que apareceu no console

**Vou aguardar seu feedback!** 🔍
