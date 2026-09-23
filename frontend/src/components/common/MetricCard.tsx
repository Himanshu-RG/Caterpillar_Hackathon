import React from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  decimals?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'normal' | 'warning' | 'critical' | 'telemetry';
  min?: number;
  max?: number;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  decimals = 0,
  trend,
  trendValue,
  status = 'telemetry',
  min,
  max,
  icon,
  subtitle,
  className,
}) => {
  const formattedValue =
    typeof value === 'number'
      ? value.toFixed(decimals)
      : value !== undefined && value !== null
      ? String(value)
      : 'N/A';

  const statusClasses = {
    normal:
      'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300',
    warning:
      'border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 shadow-sm dark:shadow-glow-amber',
    critical:
      'border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 shadow-sm dark:shadow-glow-red',
    telemetry:
      'border-slate-200 dark:border-cat-border/80 bg-white dark:bg-cat-surface-card/90 text-slate-800 dark:text-slate-100',
  };

  return (
    <div
      className={clsx(
        'industrial-card rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 border shadow-sm',
        statusClasses[status],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
        {icon && <span className="text-slate-400 dark:text-slate-400 flex-shrink-0">{icon}</span>}
      </div>

      {/* Primary Value & Unit */}
      <div className="flex items-baseline gap-1.5 my-1">
        <span className="font-mono-num text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {formattedValue}
        </span>
        {unit && (
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
            {unit}
          </span>
        )}
      </div>

      {/* Footer / Trend / Min-Max */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
        {trend && (
          <div className="flex items-center gap-1 font-medium">
            {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
            {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />}
            {trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            {trendValue && <span className="font-mono">{trendValue}</span>}
          </div>
        )}
        {subtitle && !trend && <span className="truncate">{subtitle}</span>}
        {(min !== undefined || max !== undefined) && (
          <div className="ml-auto font-mono text-[10px] text-slate-400 dark:text-slate-500">
            {min !== undefined && <span>L: {min} </span>}
            {max !== undefined && <span>H: {max}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
