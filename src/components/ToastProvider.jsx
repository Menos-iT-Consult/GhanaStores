import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { readableError, referenceCode, toApiError } from '../lib/errors.js';

const ToastContext = createContext(null);
let nextToastId = 0;

const TOAST_STYLES = {
  error: {
    icon: AlertCircle,
    classes: 'border-rose-200 bg-white text-rose-950 shadow-rose-950/10',
    iconClasses: 'bg-rose-50 text-rose-600',
    label: 'Error',
  },
  success: {
    icon: Check,
    classes: 'border-emerald-200 bg-white text-emerald-950 shadow-emerald-950/10',
    iconClasses: 'bg-emerald-50 text-emerald-600',
    label: 'Success',
  },
  info: {
    icon: Info,
    classes: 'border-blue-200 bg-white text-blue-950 shadow-blue-950/10',
    iconClasses: 'bg-blue-50 text-blue-600',
    label: 'Notice',
  },
};

function ToastItem({ toast, onDismiss }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.error;
  const Icon = style.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg ${style.classes}`}
    >
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.iconClasses}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{toast.title || style.label}</p>
        <p className="mt-0.5 break-words text-sm text-slate-600">{toast.message}</p>
        {toast.reference ? (
          <p className="mt-1 text-xs text-slate-500">Reference: {toast.reference}</p>
        ) : null}
        {toast.onRetry ? (
          <button
            type="button"
            onClick={() => {
              onDismiss(toast.id);
              toast.onRetry();
            }}
            className="mt-2 text-sm font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900"
          >
            Try again
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((type, message, options = {}) => {
    const id = ++nextToastId;
    const toast = {
      id,
      type,
      title: options.title || '',
      message: String(message || 'Something went wrong. Please try again.'),
      reference: options.reference || '',
      onRetry: options.onRetry,
      duration: options.duration || (type === 'error' ? 8000 : 5000),
    };
    setToasts((current) => [...current.slice(-3), toast]);
    return id;
  }, []);

  const notifyError = useCallback((error, options = {}) => {
    const normalised = toApiError(error);
    return notify('error', readableError(normalised), {
      ...options,
      reference: options.reference || referenceCode(normalised.requestId),
      onRetry: options.onRetry && normalised.retryable ? options.onRetry : undefined,
    });
  }, [notify]);

  const notifySuccess = useCallback((message, options) => notify('success', message, options), [notify]);
  const notifyInfo = useCallback((message, options) => notify('info', message, options), [notify]);

  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('[ui] Unhandled promise rejection:', event.reason);
      notifyError(event.reason, { title: 'The request could not be completed' });
    };
    const handleWindowError = (event) => {
      if (event.target !== window) return;
      console.error('[ui] Unhandled browser error:', event.error || event.message);
      notifyError(event.error || event.message, { title: 'Something went wrong' });
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, [notifyError]);

  const value = { notify, notifyError, notifySuccess, notifyInfo, dismiss };
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-0 sm:w-full sm:max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within <ToastProvider>');
  return context;
}
