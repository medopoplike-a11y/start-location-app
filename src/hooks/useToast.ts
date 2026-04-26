import { useState, useCallback } from "react";
import type { ToastMessage } from "@/components/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning" = "info", duration?: number) => {
      const id = Math.random().toString(36).substring(2, 11);
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => addToast(message, "success", duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, "error", duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, "info", duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, "warning", duration), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
