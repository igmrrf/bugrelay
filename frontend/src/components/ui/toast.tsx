"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, type Toast as ToastType } from "@/lib/stores/ui-store";

const ToastContext = React.createContext<{
  toasts: ToastType[];
  removeToast: (id: string) => void;
} | null>(null);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const { toasts, removeToast } = useUIStore();

  return (
    <ToastContext.Provider value={{ toasts, removeToast }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
};

const ToastViewport = () => {
  const context = React.useContext(ToastContext);
  if (!context) return null;

  const { toasts } = context;

  return (
    <div className="fixed top-0 right-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-105 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};

const Toast = ({ id, title, description, type }: ToastType) => {
  const { removeToast } = useUIStore();
  const [isVisible, setIsVisible] = React.useState(false);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(id), 300);
  };

  const Icon = React.useMemo(() => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "error":
        return AlertCircle;
      case "warning":
        return AlertTriangle;
      case "info":
      default:
        return Info;
    }
  }, [type]);

  const typeStyles = React.useMemo(() => {
    switch (type) {
      case "success":
        return "border-green-500 bg-green-50 dark:bg-green-950";
      case "error":
        return "border-red-500 bg-red-50 dark:bg-red-950";
      case "warning":
        return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950";
      case "info":
      default:
        return "border-blue-500 bg-blue-50 dark:bg-blue-950";
    }
  }, [type]);

  const iconStyles = React.useMemo(() => {
    switch (type) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  }, [type]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border-l-4 p-4 pr-8 shadow-lg transition-all duration-300",
        typeStyles,
        isVisible && !isExiting
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconStyles)} />
      <div className="flex-1 space-y-1">
        {title && (
          <div className="text-sm font-semibold text-foreground">{title}</div>
        )}
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground hover:opacity-100 focus:opacity-100 focus:outline-hidden focus:ring-2 group-hover:opacity-100"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Hook for using toasts
export const useToast = () => {
  const { addToast, removeToast, clearToasts } = useUIStore();

  return {
    toast: addToast,
    dismiss: removeToast,
    dismissAll: clearToasts,
  };
};

export { Toast, ToastViewport };
