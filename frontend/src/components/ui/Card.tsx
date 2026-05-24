import { clsx } from 'clsx';

interface Props {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover }: Props) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-white/[0.07] bg-card p-5',
        hover && 'transition-all duration-200 hover:border-white/[0.12] hover:shadow-glow-sm cursor-default',
        className
      )}
    >
      {children}
    </div>
  );
}
