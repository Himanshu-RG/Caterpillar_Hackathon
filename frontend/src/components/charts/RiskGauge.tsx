import React from 'react';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import { Badge } from '../common/Badge';

interface RiskGaugeProps {
  probability: number; // 0.0 to 1.0
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  horizon?: string;
  signals?: string[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  probability,
  riskLevel,
  horizon = '50 operating hours',
  signals = [],
  title = 'Predictive Failure Risk',
  subtitle,
  className,
}) => {
  const pct = Math.min(100, Math.max(0, Math.round(probability * 100)));

  const badgeVariant =
    riskLevel === 'HIGH' ? 'danger' : riskLevel === 'MEDIUM' ? 'warning' : 'success';

  const barColor =
    riskLevel === 'HIGH'
      ? 'bg-gradient-to-r from-amber-500 to-rose-600'
      : riskLevel === 'MEDIUM'
      ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
      : 'bg-emerald-500';

  const textColor =
    riskLevel === 'HIGH'
      ? 'text-rose-600 dark:text-rose-400'
      : riskLevel === 'MEDIUM'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className={clsx('industrial-card rounded-xl p-4 flex flex-col justify-between', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {title}
          </span>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <Badge variant={badgeVariant} size="sm">
          {riskLevel} RISK
        </Badge>
      </div>

      {/* Main Metric Display */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1.5">
          <span className={clsx('font-mono-num text-4xl font-extrabold tracking-tight', textColor)}>
            {pct}%
          </span>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Probability</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Horizon</span>
          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">{horizon}</span>
        </div>
      </div>

      {/* Progress Risk Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2.5 border border-slate-300/60 dark:border-slate-700/50">
        <div
          className={clsx('h-full transition-all duration-500 rounded-full', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Threshold Labels */}
      <div className="flex justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-3 px-0.5">
        <span>0% NORMAL</span>
        <span>35% CAUTION</span>
        <span>65% HIGH</span>
        <span>100%</span>
      </div>

      {/* Contributing Signals */}
      {signals && signals.length > 0 && (
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-cat-yellow" />
            Top Contributing Telematics Signals:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {signals.map((sig, idx) => (
              <span
                key={idx}
                className="rounded bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 px-2 py-0.5 text-[11px] font-mono"
              >
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
