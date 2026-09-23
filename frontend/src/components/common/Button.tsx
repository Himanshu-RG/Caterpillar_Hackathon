import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'cat';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-cat-yellow text-slate-950 font-bold hover:bg-amber-400 active:bg-amber-500 shadow-md',
    secondary: 'bg-cat-surface-card hover:bg-slate-800 text-slate-200 border border-cat-border active:bg-slate-700',
    cat: 'bg-cat-yellow/20 hover:bg-cat-yellow/30 text-cat-yellow border border-cat-yellow/40 active:bg-cat-yellow/40',
    danger: 'bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 border border-rose-600/70 active:bg-rose-900',
    warning: 'bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-600/70',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 active:bg-slate-800',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded gap-1.5',
    md: 'text-sm px-3.5 py-2 rounded-md gap-2 font-medium',
    lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 font-bold tracking-wide',
  };

  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center transition-colors duration-150 select-none cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex items-center">{icon}</span>
      )}
      {children}
    </button>
  );
};
