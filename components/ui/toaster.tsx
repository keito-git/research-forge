'use client';

import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-3 shadow-lg border animate-slide-up ${
            t.variant === 'destructive'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-white border-sand-200 text-ink-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="text-xs text-ink-500 mt-0.5">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="p-0.5 hover:bg-sand-100 rounded">
              <X className="w-3.5 h-3.5 text-ink-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
