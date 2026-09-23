import React from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'cat';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60 dark:shadow-glow-green',
    warning:
      'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600/60 dark:shadow-glow-amber',
    danger:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-600/70 dark:shadow-glow-red',
    info:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-600/60 dark:shadow-glow-cyan',
    neutral:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    cat:
      'bg-amber-100 text-amber-900 border-amber-300 font-bold dark:bg-cat-yellow/20 dark:text-cat-yellow dark:border-cat-yellow/50',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-500 dark:bg-emerald-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    danger: 'bg-rose-600 dark:bg-rose-500',
    info: 'bg-sky-500 dark:bg-cyan-400',
    neutral: 'bg-slate-400',
    cat: 'bg-amber-500 dark:bg-cat-yellow',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold uppercase tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-bold uppercase tracking-wider',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded border transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full inline-block', dotStyles[variant])} />}
      {children}
    </span>
  );
};
