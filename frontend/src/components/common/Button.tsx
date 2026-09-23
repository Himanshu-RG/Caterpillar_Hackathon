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
    primary:
      'bg-cat-yellow hover:bg-amber-400 text-slate-950 font-bold shadow-sm active:bg-amber-500 border border-amber-500/40',
    secondary:
      'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700',
    cat:
      'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-semibold dark:bg-cat-yellow/20 dark:hover:bg-cat-yellow/30 dark:text-cat-yellow dark:border-cat-yellow/40',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold dark:bg-rose-900/60 dark:hover:bg-rose-800/80 dark:text-rose-200 dark:border-rose-600/70',
    warning:
      'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold dark:bg-amber-900/60 dark:hover:bg-amber-800/80 dark:text-amber-200 dark:border-amber-600/70',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
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
