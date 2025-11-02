# Debug: Criação de Coleção Travando

**Data**: 2025-11-01
**Problema**: Botão "Criando..." fica travado e não finaliza

---

## 🔍 Logs de Debug Implementados

### 1. Frontend: `CollectionFormDialog.tsx`

```typescript
handleSubmit() {
  console.log('🚀 [CollectionFormDialog] handleSubmit started');
  console.log('✅ Validation passed');
  console.log('📤 Calling onSubmit...');
  // ... com timeout de 60s
  console.log('✅ onSubmit completed in XXms');
}
```

### 2. Frontend: `collectionsService.ts`

```typescript
createCollection() {
  console.log('🚀 [collectionsService] createCollection called');
  console.log('📤 Sending POST request...');
  console.log('⏱️  Fetch completed in XXms');
  console.log('📥 Parsing response JSON...');
  console.log('✅ Collection created successfully');
}
```

### 3. Backend: `routes/collections.ts`

Logs automáticos já existentes:
- "Creating collection"
- "Collection created successfully"

---

## 🧪 Como Debugar

### Passo 1: Abrir Console

1. Abrir dashboard
2. Pressionar **F12**
3. Ir para aba **Console**
4. Limpar console (Ctrl+L)

### Passo 2: Tentar Criar

1. Clicar "Nova Coleção"
2. Preencher:
   - Nome: `workspace`
   - Descrição: `Workspace data`
   - Diretório: `/data/tradingsystem/apps/workspace`
3. Clicar "Criar"

### Passo 3: Observar Logs

**Se ver isso e travar:**
```
🚀 [CollectionFormDialog] handleSubmit started
✅ Validation passed
📤 Calling onSubmit...
(trava aqui - sem mais logs)
```
→ **Problema está no hook useRagManager**

**Se ver isso e travar:**
```
🚀 [collectionsService] createCollection called
📤 Sending POST request...
(trava aqui - sem "Fetch completed")
```
→ **Problema está na requisição HTTP (network ou CORS)**

**Se ver isso e travar:**
```
⏱️  Fetch completed in XXms
(trava aqui - sem "Parsing response")
```
→ **Problema está na resposta do servidor**

---

## ✅ API Funciona Via cURL

```bash
# Testado e funciona em 0.149s
curl -X POST http://localhost:3403/api/v1/rag/collections -d '{...}'
# Resposta: 201 Created
```

---

## 🎯 Possíveis Causas

### 1. Problema de CORS
- Frontend faz request cross-origin
- Servidor bloqueia sem responder

### 2. Proxy Vite não configurado
- Request não chega ao backend
- Fica aguardando indefinidamente

### 3. Hook useRagManager travando
- TanStack Query não processa resposta
- `onSuccess` não é chamado

### 4. Validação de diretório no backend
- Scandir muito lento
- Timeout no frontend antes de receber resposta

---

## 📋 Próximos Passos

**Dependendo dos logs do Console:**

### Se travar antes de "Fetch completed"
→ Verificar proxy Vite e CORS

### Se travar depois de "Fetch completed"
→ Verificar TanStack Query

### Se aparecer "Request timeout (60s)"
→ Backend está demorando muito (validação de diretório)

---

**AGUARDANDO LOGS DO CONSOLE PARA CONTINUAR DEBUG!** 🔍

