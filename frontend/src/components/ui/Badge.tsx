import { clsx } from 'clsx';

type Variant = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

const styles: Record<Variant, string> = {
  green: 'bg-green-500/15 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  red: 'bg-red-500/15 text-red-400 border-red-500/20',
  gray: 'bg-white/[0.06] text-dim border-white/[0.1]',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

export default function Badge({
  children,
  variant = 'gray',
}: {
  children: React.ReactNode;
  variant?: Variant;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        styles[variant]
      )}
    >
      {children}
    </span>
  );
}
