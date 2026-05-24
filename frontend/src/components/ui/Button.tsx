import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary' &&
          'bg-accent text-black hover:bg-green-400 shadow-glow-sm hover:shadow-glow',
        variant === 'ghost' &&
          'bg-white/[0.05] text-dim hover:bg-white/[0.09] hover:text-white border border-white/[0.07]',
        variant === 'danger' &&
          'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}
