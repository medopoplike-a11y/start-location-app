"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import Toast, { ToastMessage } from "./Toast";

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info" | "warning" = "info", duration?: number) => {
      const id = Math.random().toString(36).substring(2, 11);
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const success = useCallback((message: string, duration?: number) => addToast(message, "success", duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, "error", duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, "info", duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, "warning", duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
