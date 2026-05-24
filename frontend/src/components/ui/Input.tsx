import { clsx } from 'clsx';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-dim uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'w-full px-3 py-2 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-muted',
          'focus:outline-none focus:ring-1 focus:ring-accent/50 focus:border-accent/50 transition-colors',
          error ? 'border-red-500/50' : 'border-white/[0.08]',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
