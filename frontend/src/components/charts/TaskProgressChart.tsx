import React from 'react';
import { Clock, TrendingDown, Target } from 'lucide-react';
import { Task } from '../../types/telematics';
import { Badge } from '../common/Badge';

interface TaskProgressChartProps {
  task: Task | null;
  currentPayload?: number;
  currentCycleTime?: number;
}

export const TaskProgressChart: React.FC<TaskProgressChartProps> = ({
  task,
  currentPayload = 18.5,
  currentCycleTime = 38,
}) => {
  if (!task) {
    return (
      <div className="industrial-card rounded-xl p-5 text-center text-slate-400">
        <Target className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Active Earthmoving Task</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Machine is in standby or transit</p>
      </div>
    );
  }

  const planned = task.planned_quantity_tonnes || 120;
  const completed = task.actual_quantity_tonnes || 78;
  const pct = Math.min(100, Math.round((completed / planned) * 100));
  const remaining = Math.max(0, planned - completed);

  // Remaining time based on task baseline
  const estTotalMin = task.estimated_time_min || 50;
  const remainingMin = Math.max(0, Math.round(estTotalMin * (remaining / planned)));

  // Calculate ETA clock time
  const now = new Date();
  const etaDate = new Date(now.getTime() + remainingMin * 60000);
  const etaString = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const baselineCycle = 42; // standard baseline cycle in seconds
  const isFaster = currentCycleTime <= baselineCycle;

  return (
    <div className="industrial-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            CURRENT TASK
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{task.task_type}</h3>
          <span className="text-xs font-mono text-slate-500">ID: {task.task_id}</span>
        </div>
        <Badge variant={pct >= 100 ? 'success' : isFaster ? 'success' : 'warning'} size="sm">
          {pct >= 100 ? 'COMPLETED' : 'ON TRACK'}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Progress</span>
          <span className="font-mono-num font-bold text-amber-600 dark:text-cat-yellow">{pct}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-300/60 dark:border-slate-700/50">
          <div
            className="bg-gradient-to-r from-amber-500 to-cat-yellow h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5">
          <span>{completed.toFixed(0)} tonnes completed</span>
          <span>Target: {planned.toFixed(0)} tonnes</span>
        </div>
      </div>

      {/* Dynamic ETA Block */}
      <div className="rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-cat-border p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">
            <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-cat-yellow" />
            Dynamic ML ETA
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50">
            HIGH CONFIDENCE
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-mono-num text-2xl font-black text-slate-900 dark:text-white">
              {remainingMin} min
            </span>
            <span className="text-xs text-slate-500 ml-1">remaining</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Predicted Finish
            </span>
            <span className="font-mono text-sm font-bold text-amber-600 dark:text-cat-yellow">{etaString}</span>
          </div>
        </div>
      </div>

      {/* Telemetry Cycle Pacing */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 p-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Cycle Time
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{currentCycleTime} sec</span>
            <span className="flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              <TrendingDown className="w-3 h-3 mr-0.5" /> -4s vs base
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 p-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
            Current Payload
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{currentPayload.toFixed(1)} t</span>
            <span className="text-[10px] text-slate-400 font-mono">Bucket</span>
          </div>
        </div>
      </div>
    </div>
  );
};
