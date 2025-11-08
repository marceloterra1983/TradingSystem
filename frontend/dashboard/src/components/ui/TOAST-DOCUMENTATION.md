---
title: Toast Notification System
sidebar_position: 1
tags: [frontend]
domain: frontend
type: guide
summary: Sistema de notificações toast para feedback visual ao usuário, implementado com Zustand para gerenciamento de estado.
status: active
last_review: "2025-10-23"
---

# Toast Notification System

## Overview

Sistema de notificações toast para feedback visual ao usuário, implementado com Zustand para gerenciamento de estado.

## Components

### ToastContainer

Container principal que renderiza todas as notificações toast. Deve ser incluído uma única vez no topo da aplicação.

**Localização:** `src/App.tsx`

```tsx
import { ToastContainer } from "./components/ui/toast";

function App() {
  return (
    <>
      {/* ... outros componentes */}
      <ToastContainer />
    </>
  );
}
```

### Toast

Componente individual de notificação com suporte para 4 tipos: success, error, warning, info.

**Características:**

- Auto-dismiss após duração configurável (padrão: 3000ms)
- Animação de entrada/saída
- Botão de fechar manual
- Ícones contextuais por tipo
- Suporte a dark mode

## Hook: useToast

Hook customizado para disparar notificações de forma simples e consistente.

### Uso Básico

```tsx
import { useToast } from "../../hooks/useToast";

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    try {
      await someAsyncAction();
      toast.success("Operação concluída com sucesso");
    } catch (error) {
      toast.error("Falha na operação");
    }
  };

  return <button onClick={handleAction}>Executar</button>;
}
```

### API do Hook

#### Métodos

- **`toast(message, type?, duration?)`** - Método genérico
- **`success(message, duration?)`** - Notificação de sucesso (verde)
- **`error(message, duration?)`** - Notificação de erro (vermelho)
- **`warning(message, duration?)`** - Notificação de aviso (amarelo)
- **`info(message, duration?)`** - Notificação informativa (azul)

#### Parâmetros

- `message: string` - Texto da notificação
- `type?: 'success' | 'error' | 'warning' | 'info'` - Tipo da notificação
- `duration?: number` - Duração em milissegundos (padrão: 3000ms, 0 = não fecha automaticamente)

### Exemplos de Uso

#### Com React Query Mutations

```tsx
const mutation = useMutation({
  mutationFn: (data) => apiService.updateData(data),
  onSuccess: () => {
    toast.success("Dados atualizados com sucesso");
  },
  onError: () => {
    toast.error("Falha ao atualizar dados");
  },
});
```

#### Com Contexto/Nome Dinâmico

```tsx
const runMutation = useMutation({
  mutationFn: (name: string) => agentsService.runAgent(name),
  onSuccess: (_, name) => {
    toast.success(`Agent "${name}" executado com sucesso`);
  },
  onError: (_, name) => {
    toast.error(`Falha ao executar agent "${name}"`);
  },
});
```

#### Diferentes Tipos

```tsx
function MyComponent() {
  const toast = useToast();

  return (
    <>
      <button onClick={() => toast.success("Salvo!")}>Success</button>

      <button onClick={() => toast.error("Erro ao processar")}>Error</button>

      <button onClick={() => toast.warning("Atenção: limite próximo")}>
        Warning
      </button>

      <button onClick={() => toast.info("Processo iniciado")}>Info</button>

      {/* Toast persistente (não fecha automaticamente) */}
      <button onClick={() => toast.info("Mensagem persistente", 0)}>
        Persistent
      </button>

      {/* Duração customizada (5 segundos) */}
      <button onClick={() => toast.success("Longa duração", 5000)}>
        Custom Duration
      </button>
    </>
  );
}
```

## Store: toastStore

Gerenciamento de estado das notificações usando Zustand.

### Interface

```tsx
interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}
```

### Uso Direto (Avançado)

```tsx
import { useToastStore } from "../store/toastStore";

function MyComponent() {
  const { toasts, addToast, clearToasts } = useToastStore();

  return (
    <>
      <div>Total de notificações: {toasts.length}</div>
      <button onClick={clearToasts}>Limpar todas</button>
    </>
  );
}
```

## Diretrizes de Uso

### ✅ Boas Práticas

1. **Mensagens concisas**: Use mensagens curtas e diretas

   ```tsx
   toast.success("Agent habilitado"); // ✅
   toast.success("O agent foi habilitado com sucesso e está pronto para uso"); // ❌ muito longo
   ```

2. **Contexto específico**: Inclua informações relevantes

   ```tsx
   toast.success(`Agent "${name}" executado com sucesso`); // ✅
   toast.success("Operação concluída"); // ❌ muito genérico
   ```

3. **Tipo apropriado**: Use o tipo correto para cada situação
   - `success`: Operação concluída com sucesso
   - `error`: Falha na operação
   - `warning`: Atenção/aviso ao usuário
   - `info`: Informação geral

4. **Timing adequado**: Use duração apropriada
   - 3000ms (padrão): Mensagens gerais
   - 5000ms+: Mensagens importantes ou longas
   - 0 (persistente): Requer ação do usuário

### ❌ Evitar

1. Notificações excessivas em sequência
2. Mensagens técnicas/códigos de erro diretos ao usuário
3. Toasts para cada atualização de estado menor
4. Usar toast para mensagens críticas que requerem confirmação (use Dialog)

## Implementação Atual

## Arquitetura

```
frontend/dashboard/src/
├── store/
│   └── toastStore.ts           # Zustand store para gerenciamento de estado
├── hooks/
│   └── useToast.ts             # Hook customizado para facilitar uso
├── components/
│   └── ui/
│       ├── toast.tsx           # Componentes Toast e ToastContainer
│       └── TOAST-DOCUMENTATION.md  # Esta documentação
└── App.tsx                     # ToastContainer incluído aqui
```

## Dependências

- **zustand** (^4.4.7) - Gerenciamento de estado
- **lucide-react** (^0.309.0) - Ícones
- **Tailwind CSS** - Estilos e dark mode

## Próximos Passos (Opcional)

1. **Ações em toast**: Adicionar botões de ação nos toasts
2. **Posicionamento**: Suporte para diferentes posições (top-left, bottom-right, etc)
3. **Agrupamento**: Agrupar múltiplas notificações do mesmo tipo
4. **Som**: Feedback sonoro opcional para notificações
5. **Acessibilidade**: ARIA announcements para screen readers
