import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  ArrowRight,
  Play,
  Pause,
  Layers,
  User,
  CheckCircle2,
} from 'lucide-react';
import { fetchTodaysTasks } from '../api/tasks';
import { Task } from '../types/telematics';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useRealtime } from '../context/RealtimeContext';

export const TasksPage: React.FC = () => {
  const {
    activeMachineId,
    operator,
    currentTask,
    startTask,
    pauseCurrentTask,
  } = useRealtime();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [scope, setScope] = useState<'MY_MACHINE' | 'ALL_FLEET'>('MY_MACHINE');
  const [filter, setFilter] = useState<'ALL' | 'ON_GOING' | 'QUEUED' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchTodaysTasks(40);
        setTasks(res);
      } catch (e) {
        console.warn('Tasks fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter tasks based on scope (My Machine vs All Fleet)
  const scopedTasks = tasks.filter((t) => {
    if (scope === 'MY_MACHINE') {
      return t.machine_id === activeMachineId;
    }
    return true;
  });

  // Filter tasks based on status pill
  const filteredTasks = scopedTasks.filter((t) => {
    const isCompleted = t.actual_quantity_tonnes >= t.planned_quantity_tonnes;
    const isOngoing = currentTask && t.task_id === currentTask.task_id;
    const isQueued = !isCompleted && !isOngoing;

    if (filter === 'ON_GOING') return isOngoing;
    if (filter === 'QUEUED') return isQueued;
    if (filter === 'COMPLETED') return isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-cat-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-cat-yellow">
              Operator Task Dispatch
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Single-Task Execution Model
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Daily Production Work Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operator <strong className="text-slate-700 dark:text-slate-200">{operator.name} ({operator.id})</strong> on machine <strong className="text-amber-600 dark:text-cat-yellow">{activeMachineId}</strong> operates exactly 1 task at a time.
          </p>
        </div>

        {/* Scope Selector: My Machine vs All Fleet */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border p-1 text-xs font-bold">
            <button
              onClick={() => setScope('MY_MACHINE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'MY_MACHINE'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Machine ({activeMachineId})</span>
            </button>
            <button
              onClick={() => setScope('ALL_FLEET')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'ALL_FLEET'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Quarry Fleet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Active Task Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border rounded-lg text-xs font-bold uppercase">
          {(['ALL', 'ON_GOING', 'QUEUED', 'COMPLETED'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                filter === mode
                  ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Current Operator State Notice */}
        <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Current State:{' '}
          {currentTask ? (
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              1 ON-GOING ({currentTask.task_id})
            </span>
          ) : (
            <span className="font-bold text-slate-400">IDLE (No active task)</span>
          )}
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 font-mono">
          Loading assigned work orders from telematics data hub...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="industrial-card rounded-2xl p-12 text-center text-slate-400">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-400">No matching tasks found</p>
          <p className="text-xs text-slate-500 mt-1">Try switching to &quot;All Quarry Fleet&quot; or clearing filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const planned = t.planned_quantity_tonnes || 100;
            const completed = t.actual_quantity_tonnes || 0;
            const pct = Math.min(100, Math.round((completed / planned) * 100));
            const isDone = pct >= 100;
            const isOngoing = currentTask && t.task_id === currentTask.task_id;

            return (
              <div
                key={t.task_id}
                className={`industrial-card rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all duration-150 ${
                  isOngoing
                    ? 'border-2 border-amber-400 dark:border-cat-yellow ring-2 ring-amber-400/20'
                    : 'hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {isOngoing ? (
                      <Badge variant="warning" size="sm" dot>
                        ON-GOING
                      </Badge>
                    ) : isDone ? (
                      <Badge variant="success" size="sm">
                        COMPLETED
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        QUEUED
                      </Badge>
                    )}
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{t.task_id}</span>
                  </div>

                  <h3
                    onClick={() => navigate(`/tasks/${t.task_id}`)}
                    className="text-base font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-cat-yellow transition-colors cursor-pointer"
                  >
                    {t.task_type}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 mb-3">
                    <span>Machine: <strong>{t.machine_id}</strong></span>
                    <span>·</span>
                    <span>Op: {t.operator_id}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 my-3">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-500 dark:text-slate-400">Progress</span>
                      <span className="text-amber-600 dark:text-cat-yellow font-bold">
                        {completed.toFixed(0)} / {planned.toFixed(0)} t ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-cat-yellow'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Operator Actions & Detail Link */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.estimated_time_min?.toFixed(0) || 45}m</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Start or Pause Task Button */}
                    {!isDone && (
                      isOngoing ? (
                        <button
                          onClick={() => pauseCurrentTask()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                          title="Pause this task and set machine to Idle"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => startTask(t)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer transition-colors shadow-sm"
                          title="Start this task (sets machine to active on this single task)"
                        >
                          <Play className="w-3 h-3 fill-slate-950" />
                          <span>Start</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => navigate(`/tasks/${t.task_id}`)}
                      className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-semibold transition-colors cursor-pointer pl-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
