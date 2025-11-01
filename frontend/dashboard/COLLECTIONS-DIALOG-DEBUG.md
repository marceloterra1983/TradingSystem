# 🔍 Debug: Collections Dialog Not Opening

**Problema Reportado:** Popup de "Nova Coleção" não abre ao clicar no botão

**URL:** http://localhost:3103/#/rag-services

---

## ✅ Verificações Realizadas

### 1. Dashboard Status
- ✅ Dashboard rodando na porta 3103
- ✅ Página carrega corretamente
- ✅ Backend respondendo (port 3402)

### 2. Componentes Existentes
- ✅ `CollectionsManagementCard.tsx` - Componente principal
- ✅ `CollectionFormDialog.tsx` - Dialog de formulário
- ✅ `EmbeddingModelSelector.tsx` - Seletor de modelo
- ✅ `DirectorySelector.tsx` - Seletor de diretório
- ✅ `alert.tsx` - Componente de alerta
- ✅ `label.tsx` - Componente de label
- ✅ `collapsible.tsx` - Componente colapsável
- ✅ `switch.tsx` - Switch toggle
- ✅ `dialog.tsx` - Dialog base

### 3. Hook useCollections
- ✅ Hook existe e está correto
- ✅ Retorna `models` array
- ✅ Sem loops infinitos (corrigido anteriormente)

---

## 🧪 Como Diagnosticar

### Passo 1: Abrir Console do Navegador

1. Abrir: http://localhost:3103/#/rag-services
2. Pressionar `F12` (DevTools)
3. Ir para aba **Console**
4. Fazer hard refresh: `Ctrl + Shift + R`

**Procurar por:**
- Erros em vermelho (TypeScript, runtime, etc.)
- Warnings em amarelo
- Mensagens de erro de importação

### Passo 2: Testar o Botão

1. Scroll até seção "Gerenciamento de Coleções"
2. Localizar botão "Nova Coleção" (canto superior direito)
3. Abrir aba **Console** (F12)
4. Clicar no botão "Nova Coleção"
5. Observar console:
   - Algum erro aparece?
   - Alguma mensagem de estado?

### Passo 3: Verificar Estado do Componente

Com React DevTools:

1. Instalar extensão: React Developer Tools (Chrome/Firefox)
2. Abrir aba "Components" no DevTools
3. Localizar componente `CollectionsManagementCard`
4. Verificar estado:
   - `dialogOpen: false` (inicialmente)
   - `models: []` ou `models: [...]` (deve ter 2 modelos)
   - `isLoading: false`
5. Clicar botão "Nova Coleção"
6. Verificar se `dialogOpen` muda para `true`

### Passo 4: Verificar Rede (Network)

1. Abrir aba **Network** (F12)
2. Filtrar por "rag"
3. Verificar requisições:
   - `GET /api/v1/rag/collections` - deve retornar 200
   - `GET /api/v1/rag/models` - deve retornar 200
4. Se 404 ou erro: problema no backend

---

## 🐛 Possíveis Causas

### Causa 1: Modelos Vazios

**Sintoma:** `models` array está vazio `[]`

**Verificar:**
```javascript
// No console do navegador (F12)
// Após página carregar
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
```

**Se modelos estão vazios:**
- Hook não carregou ainda (aguardar loading)
- API retornou erro
- Hook tem erro de lógica

**Solução:** Ver logs do console, verificar requisição à API

### Causa 2: Dialog Component com Erro

**Sintoma:** Erro no console ao tentar abrir dialog

**Verificar:**
- Mensagem de erro exata
- Stack trace mostra qual componente falhou

**Possíveis erros:**
- Falta prop obrigatória
- Tipo incorreto de prop
- Componente filho com erro

### Causa 3: Estado Não Atualiza

**Sintoma:** Clicar botão não muda `dialogOpen` para `true`

**Verificar:**
```tsx
// Em CollectionsManagementCard.tsx, linha 111-115
const handleCreate = () => {
  setSelectedCollection(undefined);
  setDialogMode('create');
  setDialogOpen(true); // ← Deve executar
};
```

**Se não executar:**
- Evento onClick não está vinculado
- Função não é chamada
- SetState falha por algum motivo

### Causa 4: CSS Oculta Dialog

**Sintoma:** Dialog abre mas não é visível

**Verificar:**
- Inspecionar elemento (F12 → Elements)
- Procurar por `[role="dialog"]` ou `data-state="open"`
- Verificar estilos CSS:
  - `display: none`
  - `visibility: hidden`
  - `opacity: 0`
  - `z-index` muito baixo

---

## 🔧 Correções Possíveis

### Correção 1: Adicionar Logs de Debug

Adicionar logs temporários em `CollectionsManagementCard.tsx`:

```tsx
const handleCreate = () => {
  console.log('🟢 handleCreate called'); // ← Adicionar
  setSelectedCollection(undefined);
  setDialogMode('create');
  console.log('🟢 Setting dialogOpen to true'); // ← Adicionar
  setDialogOpen(true);
};

// No render
console.log('🔍 Render:', { dialogOpen, models, isLoading }); // ← Adicionar
```

### Correção 2: Verificar Prop `open`

Em `CollectionFormDialog.tsx`, verificar se prop `open` está sendo recebida:

```tsx
export const CollectionFormDialog: React.FC<CollectionFormDialogProps> = ({
  open, // ← Deve receber valor
  onClose,
  // ...
}) => {
  console.log('🔍 Dialog open:', open); // ← Adicionar debug

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* ... */}
    </Dialog>
  );
};
```

### Correção 3: Forçar Dialog Aberto (Teste)

Teste se dialog funciona forçando `open={true}`:

```tsx
<CollectionFormDialog
  open={true} // ← Forçar true
  onClose={() => setDialogOpen(false)}
  // ...
/>
```

Se abrir: problema é no estado `dialogOpen`
Se não abrir: problema é no componente Dialog

---

## 📋 Checklist de Diagnóstico

Execute na ordem:

- [ ] **Console limpo?** (sem erros ao carregar página)
- [ ] **Modelos carregaram?** (verificar Network → `/api/v1/rag/models`)
- [ ] **Botão existe?** (visível na página)
- [ ] **Botão habilitado?** (não está `disabled`)
- [ ] **onClick funciona?** (console mostra log ao clicar)
- [ ] **Estado atualiza?** (React DevTools mostra `dialogOpen: true`)
- [ ] **Dialog renderiza?** (Elements mostra `[role="dialog"]`)
- [ ] **Dialog visível?** (CSS não oculta)

---

## 💡 Solução Rápida

Se nada funcionar, tente **isolar o problema**:

### Teste 1: Botão de Teste Simples

Adicionar botão de teste direto na página:

```tsx
// Em LlamaIndexPage.tsx, no início do render
<button
  onClick={() => alert('Botão funciona!')}
  style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}
>
  TESTE
</button>
```

Se funcionar: problema específico do botão "Nova Coleção"

### Teste 2: Dialog Sempre Aberto

Forçar dialog aberto:

```tsx
<CollectionFormDialog
  open={true}
  models={[
    { name: 'nomic-embed-text', dimensions: 384, description: 'Test', isDefault: true, available: true },
    { name: 'mxbai-embed-large', dimensions: 1024, description: 'Test', isDefault: false, available: true }
  ]}
  onClose={() => {}}
  onSubmit={async () => {}}
  mode="create"
/>
```

Se aparecer: problema é no estado ou props
Se não aparecer: problema é no componente Dialog

---

## 📞 O que Informar

Se o problema persistir, envie:

1. **Screenshot do console** (F12 → Console)
   - Mostrar erros em vermelho
   - Mostrar warnings

2. **Screenshot da aba Network** (F12 → Network)
   - Filtrar por "rag"
   - Mostrar status das requisições

3. **Screenshot do React DevTools** (se instalado)
   - Componente `CollectionsManagementCard`
   - Mostrar valores de:
     - `dialogOpen`
     - `models`
     - `isLoading`

4. **Resultado dos testes acima**
   - Qual teste funcionou?
   - Qual teste falhou?
   - Qual erro exato apareceu?

Com essas informações, consigo identificar e corrigir o problema exato! 🔧
