import React from 'react';
import clsx from 'clsx';

interface StatusIndicatorProps {
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'NORMAL' | 'WARNING' | 'CRITICAL';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
  className,
}) => {
  const isHealthy = status === 'CONNECTED' || status === 'NORMAL';
  const isWarning = status === 'CONNECTING' || status === 'WARNING';
  const isCritical = status === 'DISCONNECTED' || status === 'CRITICAL';

  const dotColor = isHealthy
    ? 'bg-emerald-500 dark:bg-emerald-400 dark:shadow-glow-green'
    : isWarning
    ? 'bg-amber-500 dark:bg-amber-400 dark:shadow-glow-amber animate-pulse'
    : 'bg-rose-600 dark:bg-rose-500 dark:shadow-glow-red animate-pulse-fast';

  const textColor = isHealthy
    ? 'text-emerald-700 dark:text-emerald-400'
    : isWarning
    ? 'text-amber-700 dark:text-amber-400'
    : 'text-rose-700 dark:text-rose-400';

  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  const textSize = size === 'sm' ? 'text-xs font-semibold' : size === 'md' ? 'text-xs font-bold' : 'text-sm font-bold';

  return (
    <div className={clsx('inline-flex items-center gap-2', className)}>
      <span className="relative flex items-center justify-center">
        {isCritical && (
          <span className={clsx('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping-slow bg-rose-400')} />
        )}
        <span className={clsx('rounded-full', dotSize, dotColor)} />
      </span>
      {label && <span className={clsx('tracking-wider uppercase', textSize, textColor)}>{label}</span>}
    </div>
  );
};
