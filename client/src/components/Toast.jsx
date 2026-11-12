import { useCallback, useState } from 'react';
import { useEffect } from 'react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);
  if (!toast) return null;
  return <div className={`toast-message${toast.error ? ' error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.message}</div>;
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, error = false) => setToast({ message, error }), []);
  const close = useCallback(() => setToast(null), []);
  return { toast, notify, close };
}
