/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Global toast notification system — lightweight, no dependencies.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider shadow-2xl border rounded-sm
              ${t.exiting ? 'animate-[toastOut_0.25s_ease-in_forwards]' : 'animate-[toastIn_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]'}
              ${t.type === 'success' ? 'bg-[#1A1A1A] text-[#A8D5A2] border-[#2E7D32]' : ''}
              ${t.type === 'error'   ? 'bg-[#1A1A1A] text-[#FFCDD2] border-[#B71C1C]' : ''}
              ${t.type === 'info'    ? 'bg-[#1A1A1A] text-[#C5A059] border-[#C5A059]/50' : ''}
            `}
          >
            {t.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {t.type === 'error'   && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {t.type === 'info'    && <Info className="w-3.5 h-3.5 shrink-0" />}
            <span className="font-mono">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

