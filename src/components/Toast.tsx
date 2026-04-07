"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, InfoIcon, XCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const config = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-900",
      icon: <XCircle className="w-5 h-5 text-red-600" />,
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      icon: <InfoIcon className="w-5 h-5 text-blue-600" />,
    },
  };

  const style = config[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -10, x: 20 }}
      className={`${style.bg} ${style.border} border rounded-2xl p-4 flex items-start gap-3 shadow-lg pointer-events-auto`}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <p className={`${style.text} text-sm font-bold flex-1`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
