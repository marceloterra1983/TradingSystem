import { useToastStore, ToastType } from '../store/toastStore';

export function useToast() {
  const { addToast } = useToastStore();

  const toast = (title: string, type: ToastType = 'info', duration?: number) => {
    addToast({ title, type, duration });
  };

  const success = (title: string, duration?: number) => {
    addToast({ title, type: 'success', duration });
  };

  const error = (title: string, duration?: number) => {
    addToast({ title, type: 'error', duration });
  };

  const warning = (title: string, duration?: number) => {
    addToast({ title, type: 'warning', duration });
  };

  const info = (title: string, duration?: number) => {
    addToast({ title, type: 'info', duration });
  };

  return {
    toast,
    success,
    error,
    warning,
    info,
  };
}

