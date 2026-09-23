import React, { useState } from 'react';
import { Lightbulb, CheckCircle, ArrowRight } from 'lucide-react';
import { Insight } from '../../types/telematics';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface InsightCardProps {
  insight: Insight;
  onAcknowledge?: (id: string) => Promise<void>;
  compact?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onAcknowledge,
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const isAck = insight.status === 'ACKNOWLEDGED';

  const severityBadgeVariant =
    insight.severity === 'CRITICAL'
      ? 'danger'
      : insight.severity === 'HIGH'
      ? 'warning'
      : insight.severity === 'MEDIUM'
      ? 'warning'
      : 'info';

  const handleAck = async () => {
    if (loading || isAck || !onAcknowledge) return;
    setLoading(true);
    try {
      await onAcknowledge(insight.insight_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`industrial-card rounded-xl p-4 transition-all duration-200 border ${
        isAck
          ? 'opacity-60 border-slate-200 dark:border-slate-800'
          : insight.severity === 'CRITICAL'
          ? 'border-rose-300 dark:border-rose-600/70 shadow-sm dark:shadow-glow-red'
          : insight.severity === 'HIGH'
          ? 'border-amber-300 dark:border-amber-600/70 shadow-sm dark:shadow-glow-amber'
          : 'border-slate-200 dark:border-cat-border hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={severityBadgeVariant} size="sm">
            {insight.severity}
          </Badge>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
            {insight.source || 'INTELLIGENCE_ENGINE'}
          </span>
          {insight.risk !== null && insight.risk !== undefined && (
            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 font-bold">
              Risk: {(insight.risk * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
          {insight.timestamp ? insight.timestamp.slice(11, 19) : ''}
        </span>
      </div>

      <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
        <Lightbulb className="w-4 h-4 text-amber-500 dark:text-cat-yellow flex-shrink-0" />
        <span>{insight.title}</span>
      </h4>

      {!compact && insight.message && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
          {insight.message}
        </p>
      )}

      {/* Recommended Action Box */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-2.5 mb-3 flex items-start gap-2">
        <ArrowRight className="w-4 h-4 text-amber-600 dark:text-cat-yellow flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5 uppercase tracking-wider text-[10px]">
            Recommended Operator Action:
          </span>
          <span className="text-amber-900 dark:text-amber-100 font-medium">
            {insight.recommended_action}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {isAck ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" /> Acknowledged
          </span>
        ) : (
          <Button
            variant="cat"
            size="sm"
            loading={loading}
            onClick={handleAck}
            className="text-xs font-bold"
          >
            Acknowledge Insight
          </Button>
        )}
      </div>
    </div>
  );
};
