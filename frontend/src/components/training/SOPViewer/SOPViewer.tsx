import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { TrainingStep } from '../../../training/types';

interface SOPViewerProps {
  steps: TrainingStep[];
}

export const SOPViewer: React.FC<SOPViewerProps> = ({ steps }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-cat-border/60">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Standard Operating Procedure (SOP)
        </h3>
        <span className="text-xs font-mono text-amber-600 dark:text-cat-yellow font-bold">
          {steps.length} Sequenced Steps
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className="industrial-card rounded-xl p-4 space-y-2.5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 text-slate-950 font-black text-xs">
                  {step.sequence}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Target: {step.timeTargetSeconds}s
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed pl-8">
              {step.instruction}
            </p>

            {step.safetyNote && (
              <div className="ml-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 p-2.5 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold uppercase text-[10px] block">Safety Protocol:</strong>
                  <span>{step.safetyNote}</span>
                </div>
              </div>
            )}

            <div className="ml-8 pt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Expected Condition: {step.expectedMachineCondition}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
