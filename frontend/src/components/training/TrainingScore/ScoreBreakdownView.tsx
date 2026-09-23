import React from 'react';
import { Award, Clock, ListOrdered, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ScoreBreakdown } from '../../../training/types';
import { Badge } from '../../common/Badge';

interface ScoreBreakdownViewProps {
  score: ScoreBreakdown;
  moduleTitle: string;
  machineName: string;
}

export const ScoreBreakdownView: React.FC<ScoreBreakdownViewProps> = ({
  score,
  moduleTitle,
  machineName,
}) => {
  return (
    <div className="industrial-card rounded-2xl p-6 sm:p-8 space-y-6 shadow-md border-amber-400/60 dark:border-cat-yellow/40">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow block">
            Hardware Validation Assessment
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{machineName}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Score
            </span>
            <span className="font-mono-num text-4xl font-black text-slate-900 dark:text-white">
              {score.totalScore}
              <span className="text-lg font-bold text-slate-400">/100</span>
            </span>
          </div>

          <Badge variant={score.isReady ? 'success' : 'warning'} size="lg">
            {score.isReady ? 'OPERATOR READY' : 'RETRY RECOMMENDED'}
          </Badge>
        </div>
      </div>

      {/* Transparent 3-Pillar Scoring Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Response Time (up to 30) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>Response Time</span>
            </div>
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {score.responseTimeScore} / 30
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all"
              style={{ width: `${(score.responseTimeScore / 30) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Total elapsed time: {score.totalTimeSeconds} seconds
          </span>
        </div>

        {/* 2. Sequence Adherence (up to 30) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ListOrdered className="w-4 h-4 text-purple-500" />
              <span>Sequence Adherence</span>
            </div>
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {score.sequenceScore} / 30
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${(score.sequenceScore / 30) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            All checklist steps completed in correct order
          </span>
        </div>

        {/* 3. Safety Compliance (up to 40) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <ShieldAlert className="w-4 h-4 text-emerald-500" />
              <span>Safety Compliance</span>
            </div>
            <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
              {score.safetyComplianceScore} / 40
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${(score.safetyComplianceScore / 40) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            {score.safetyViolationsCount === 0
              ? 'Zero safety violations recorded'
              : `${score.safetyViolationsCount} safety interruptions handled`}
          </span>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
        <strong>Notice:</strong> This assessment evaluates simulated in-cab hardware telemetry adherence. It represents an internal <strong>Operator Readiness Badge</strong> and does not substitute for state or federal heavy equipment licensing.
      </div>
    </div>
  );
};
