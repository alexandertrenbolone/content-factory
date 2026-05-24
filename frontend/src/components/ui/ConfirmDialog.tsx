import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from './Button';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm mx-4 rounded-xl border border-white/[0.09] bg-card shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between p-5 pb-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            variant === 'danger' ? 'bg-red-500/10' : 'bg-accent/10'
          }`}>
            {variant === 'danger'
              ? <Trash2 className="w-4 h-4 text-red-400" />
              : <AlertTriangle className="w-4 h-4 text-accent" />
            }
          </div>
          <button
            onClick={onCancel}
            className="text-muted hover:text-white transition-colors -mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-white mt-1">{title}</h3>
          {description && (
            <p className="text-xs text-muted mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <Button variant={variant} onClick={onConfirm} className="flex-1">
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
}
