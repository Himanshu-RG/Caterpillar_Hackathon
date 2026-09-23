import React from 'react';
import clsx from 'clsx';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  variant?: 'default' | 'danger' | 'warning' | 'cat';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  icon,
  badge,
  children,
  className,
  headerClassName,
  bodyClassName,
  variant = 'default',
}) => {
  const borderVariants = {
    default: 'border-cat-border/80 hover:border-cat-border',
    danger: 'border-rose-600/70 shadow-glow-red',
    warning: 'border-amber-600/70 shadow-glow-amber',
    cat: 'border-cat-yellow/60 shadow-glow-amber',
  };

  return (
    <div
      className={clsx(
        'industrial-card rounded-lg relative overflow-hidden transition-all duration-200',
        borderVariants[variant],
        className
      )}
    >
      {(title || action || icon || badge) && (
        <div
          className={clsx(
            'px-4 py-3.5 border-b border-cat-border/60 flex items-center justify-between gap-3 bg-slate-900/60',
            headerClassName
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-cat-muted flex-shrink-0">{icon}</span>}
            <div className="min-w-0">
              {title && (
                <h3 className="text-xs uppercase tracking-wider font-bold text-slate-300 truncate">
                  {title}
                </h3>
              )}
              {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
            </div>
            {badge && <div className="ml-2 flex-shrink-0">{badge}</div>}
          </div>
          {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={clsx('p-4', bodyClassName)}>{children}</div>
    </div>
  );
};
