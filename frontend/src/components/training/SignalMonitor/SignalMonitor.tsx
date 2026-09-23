import React from 'react';
import { CheckCircle2, Circle, AlertCircle, Cpu } from 'lucide-react';
import { StepEvaluationResult, TrainingStep } from '../../../training/types';

interface SignalMonitorProps {
  currentStep: TrainingStep;
  evaluationResult: StepEvaluationResult | null;
  isEvaluating: boolean;
}

export const SignalMonitor: React.FC<SignalMonitorProps> = ({
  currentStep,
  evaluationResult,
  isEvaluating,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-cat-border/60">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-500 dark:text-cat-yellow" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Hardware Signal Monitor
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
            evaluationResult?.allRulesPassed
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-cat-yellow'
          }`}
        >
          {evaluationResult?.allRulesPassed
            ? '✓ Conditions Met'
            : isEvaluating
            ? 'Waiting for Machine Action'
            : 'Ready'}
        </span>
      </div>

      {/* Required Conditions Checklist */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Required In-Cab Conditions:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentStep.validationRules.map((rule, idx) => {
            const ruleRes = evaluationResult?.ruleResults?.find((r) => r.rule.signal === rule.signal);
            const isPassed = Boolean(ruleRes?.passed);
            const currentVal = ruleRes?.currentValue;

            return (
              <div
                key={idx}
                className={`rounded-xl p-3.5 border transition-all duration-200 flex items-start gap-3 ${
                  isPassed
                    ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isPassed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 dark:text-slate-600 animate-pulse" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rule.label || rule.signal}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-black uppercase ${
                        isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-cat-yellow'
                      }`}
                    >
                      {isPassed ? 'VERIFIED' : 'WAITING'}
                    </span>
                  </div>

                  <div className="mt-1 font-mono text-xs flex items-baseline justify-between">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">
                      {currentVal !== undefined && currentVal !== null
                        ? typeof currentVal === 'boolean'
                          ? currentVal
                            ? 'FASTENED / ACTIVE'
                            : 'UNFASTENED'
                          : typeof currentVal === 'number'
                          ? currentVal.toFixed(1)
                          : String(currentVal)
                        : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Req: {rule.operator} {String(rule.value)}
                    </span>
                  </div>

                  {rule.isSimulatedFallback && (
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">
                      *Validated via pilot manifold pressure
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
