import { useToastStore, ToastType } from "../store/toastStore";

export function useToast() {
  const { addToast } = useToastStore();

  const toast = (
    message: string,
    type: ToastType = "info",
    duration?: number,
  ) => {
    addToast({ message, type, duration });
  };

  const success = (message: string, duration?: number) => {
    addToast({ message, type: "success", duration });
  };

  const error = (message: string, duration?: number) => {
    addToast({ message, type: "error", duration });
  };

  const warning = (message: string, duration?: number) => {
    addToast({ message, type: "warning", duration });
  };

  const info = (message: string, duration?: number) => {
    addToast({ message, type: "info", duration });
  };

  return {
    toast,
    success,
    error,
    warning,
    info,
  };
}
