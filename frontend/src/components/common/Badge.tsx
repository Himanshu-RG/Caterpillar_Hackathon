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
    success: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-glow-green',
    warning: 'bg-amber-950/80 text-amber-300 border-amber-600/60 shadow-glow-amber',
    danger: 'bg-rose-950/80 text-rose-300 border-rose-600/70 shadow-glow-red animate-pulse-fast',
    info: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60 shadow-glow-cyan',
    neutral: 'bg-slate-900 text-slate-300 border-slate-700/60',
    cat: 'bg-cat-yellow/20 text-cat-yellow border-cat-yellow/50',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-500',
    info: 'bg-cyan-400',
    neutral: 'bg-slate-400',
    cat: 'bg-cat-yellow',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold uppercase tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-bold uppercase tracking-wider',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded border backdrop-blur-sm',
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
