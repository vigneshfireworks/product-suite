"use client";
import React, { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (v: boolean) => void;
}

// Hook — call confirm("title", "message") and await the boolean
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((
    title: string,
    message = "This action cannot be undone.",
    confirmLabel = "Delete",
    danger = true
  ): Promise<boolean> =>
    new Promise(resolve => {
      setState({ open: true, title, message, confirmLabel, danger, resolve });
    }), []);

  const ConfirmDialog = useCallback(() => {
    if (!state) return null;
    const { title, message, confirmLabel, danger, resolve } = state;
    const yes = () => { setState(null); resolve(true); };
    const no  = () => { setState(null); resolve(false); };
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={no} />
        <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
          <div className="flex items-start gap-4 mb-5">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${danger ? "bg-red-50" : "bg-yellow-50"}`}>
              <AlertTriangle size={22} className={danger ? "text-red-500" : "text-yellow-500"} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-brand-dark text-base">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={yes}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={danger
                ? { background: "#ef4444", color: "#fff" }
                : { background: "#FFC43F", color: "#fff" }}
            >
              {confirmLabel}
            </button>
            <Button variant="ghost" onClick={no} className="flex-1">Cancel</Button>
          </div>
        </div>
      </div>
    );
  }, [state]);

  return { confirm, ConfirmDialog };
}
