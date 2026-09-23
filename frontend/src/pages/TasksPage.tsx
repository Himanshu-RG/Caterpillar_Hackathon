import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  Target,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { fetchTodaysTasks } from '../api/tasks';
import { Task } from '../types/telematics';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
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

  const filteredTasks = tasks.filter((t) => {
    const isCompleted = t.actual_quantity_tonnes >= t.planned_quantity_tonnes;
    if (filter === 'IN_PROGRESS') return !isCompleted;
    if (filter === 'COMPLETED') return isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Site Operations Management
          </span>
          <h1 className="text-2xl font-black text-white">Daily Production Tasks</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active and scheduled earthmoving dispatches with ML cycle pacing.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-cat-border rounded-lg text-xs font-bold uppercase">
          {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === mode
                  ? 'bg-cat-yellow text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-500 font-mono">
          Loading assigned work orders from telematics data hub...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="industrial-card rounded-lg p-12 text-center text-slate-500">
          <CheckSquare className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-sm font-bold text-slate-400">No matching tasks found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const planned = t.planned_quantity_tonnes || 100;
            const completed = t.actual_quantity_tonnes || 0;
            const pct = Math.min(100, Math.round((completed / planned) * 100));
            const isDone = pct >= 100;

            return (
              <div
                key={t.task_id}
                onClick={() => navigate(`/tasks/${t.task_id}`)}
                className="industrial-card rounded-lg p-4 cursor-pointer hover:border-cat-yellow/60 group transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={isDone ? 'success' : 'warning'} size="sm">
                      {isDone ? 'COMPLETED' : 'IN PROGRESS'}
                    </Badge>
                    <span className="font-mono text-xs text-slate-500">{t.task_id}</span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-cat-yellow transition-colors">
                    {t.task_type}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1 mb-3">
                    <span>Machine: {t.machine_id}</span>
                    <span>·</span>
                    <span>Operator: {t.operator_id}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 my-3">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Tonnage</span>
                      <span className="text-cat-yellow font-bold">
                        {completed.toFixed(0)} / {planned.toFixed(0)} t ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cat-yellow h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Est: {t.estimated_time_min?.toFixed(0) || 45} min</span>
                  </div>
                  <span className="flex items-center text-cat-yellow font-bold group-hover:translate-x-1 transition-transform">
                    Inspect <ChevronRight className="w-4 h-4 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
