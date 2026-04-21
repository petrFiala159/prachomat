"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: string;
  message: string;
  action?: { label: string; onClick: () => void };
  type?: "default" | "success" | "error";
};

type ToastCtx = {
  show: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastCtx>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm animate-in fade-in slide-in-from-bottom-4",
              t.type === "error"
                ? "bg-destructive text-destructive-foreground border-destructive"
                : t.type === "success"
                ? "bg-emerald-600 text-white border-emerald-700"
                : "bg-card text-foreground border-border"
            )}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                className="font-semibold underline underline-offset-2 shrink-0"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
