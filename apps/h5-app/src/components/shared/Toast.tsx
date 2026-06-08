import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Toast as ToastType } from '@/types';

export interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-teal/15',
    border: 'border-teal/30',
    iconColor: 'text-teal',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-danger/15',
    border: 'border-danger/30',
    iconColor: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning/15',
    border: 'border-warning/30',
    iconColor: 'text-warning',
  },
  info: {
    icon: Info,
    bg: 'bg-ocean/30',
    border: 'border-coral/30',
    iconColor: 'text-coral',
  },
};

export function ToastItem({ toast, onRemove }: { toast: ToastType; onRemove: (id: string) => void }) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 shadow-card-elevated',
        'min-w-[280px] max-w-[360px]',
        config.bg,
        config.border
      )}
    >
      <Icon size={20} className={cn('mt-0.5 shrink-0', config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="text-caption text-text-secondary mt-0.5 line-clamp-2">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
