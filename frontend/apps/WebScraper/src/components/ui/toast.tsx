import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useToastStore, Toast } from '../../store/toastStore';

interface ToastProps {
  toast: Toast;
}

function ToastItem({ toast }: ToastProps) {
  const { removeToast } = useToastStore();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast.duration) {
      return;
    }
    const animationBuffer = 250;
    const exitTimer = window.setTimeout(() => setExiting(true), toast.duration - animationBuffer);
    const removalTimer = window.setTimeout(() => removeToast(toast.id), toast.duration);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(removalTimer);
    };
  }, [toast.duration, toast.id, removeToast]);

  const handleClose = () => {
    setExiting(true);
    window.setTimeout(() => removeToast(toast.id), 200);
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />
  };

  const bgClasses = {
    success:
      'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
    error:
      'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200',
    warning:
      'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
    info:
      'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
  };

  return (
    <div
      className={clsx(
        'flex min-w-[280px] max-w-md items-start gap-3 rounded-xl border p-4 shadow-lg transition-all duration-200',
        bgClasses[toast.type],
        exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      <div className="mt-0.5 text-current opacity-80">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={handleClose}
        className="text-current opacity-60 transition hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToastStore();
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-3">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
