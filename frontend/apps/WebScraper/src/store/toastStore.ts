import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>(set => ({
  toasts: [],
  showToast: toast => {
    const id =
      toast.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.round(Math.random() * 10_000)}`);
    set(state => ({
      toasts: [...state.toasts, { ...toast, id, duration: toast.duration ?? 5000 }]
    }));
    return id;
  },
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    })),
  clear: () => set({ toasts: [] })
}));
