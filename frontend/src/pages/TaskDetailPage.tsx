import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Target,
  CheckCircle2,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { fetchTaskById } from '../api/tasks';
import { predictTaskTime } from '../api/predictions';
import { Task, TaskPrediction } from '../types/telematics';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [prediction, setPrediction] = useState<TaskPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!taskId) return;
      try {
        const t = await fetchTaskById(taskId);
        setTask(t);

        // Fetch dynamic ETA prediction from ML model endpoint
        try {
          const pred = await predictTaskTime({
            task_type: t.task_type,
            machine_id: t.machine_id,
            operator_id: t.operator_id,
            planned_quantity_tonnes: t.planned_quantity_tonnes,
            estimated_time_min: t.estimated_time_min,
            completed_tonnes: t.actual_quantity_tonnes,
            current_elapsed_min: t.actual_time_min || 0,
          });
          setPrediction(pred);
        } catch (predErr) {
          console.warn('Prediction fetch error:', predErr);
        }
      } catch (e) {
        console.warn('Task detail error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs font-mono text-slate-400">
        Loading task work order specifications and dynamic regression forecast...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="industrial-card rounded-xl p-10 text-center space-y-3">
        <p className="text-sm font-bold text-rose-500">Task '{taskId}' was not found.</p>
        <Button variant="secondary" onClick={() => navigate('/tasks')} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const planned = task.planned_quantity_tonnes || 120;
  const completed = task.actual_quantity_tonnes || 0;
  const remaining = Math.max(0, planned - completed);
  const pct = Math.min(100, Math.round((completed / planned) * 100));

  const remMin = prediction
    ? Math.round(prediction.estimated_remaining_min)
    : Math.max(0, Math.round((task.estimated_time_min || 50) - (task.actual_time_min || 0)));

  const now = new Date();
  const etaDate = new Date(now.getTime() + remMin * 60000);
  const etaFormatted = etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Bar with Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tasks')}
          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">{task.task_type}</h1>
            <Badge variant={pct >= 100 ? 'success' : 'warning'} size="sm">
              {pct >= 100 ? 'COMPLETED' : 'IN PROGRESS'}
            </Badge>
          </div>
          <span className="font-mono text-xs text-slate-500">Task Dispatch ID: {task.task_id}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Planned Target"
          value={planned.toFixed(0)}
          unit="tonnes"
          icon={<Target className="w-4 h-4 text-amber-500 dark:text-cat-yellow" />}
        />
        <MetricCard
          label="Completed"
          value={completed.toFixed(0)}
          unit="tonnes"
          status={pct >= 100 ? 'normal' : 'telemetry'}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />
        <MetricCard
          label="Remaining"
          value={remaining.toFixed(0)}
          unit="tonnes"
          icon={<Target className="w-4 h-4 text-amber-500" />}
        />
        <MetricCard
          label="Predicted ETA"
          value={remMin}
          unit="min"
          subtitle={`Arrival: ${etaFormatted}`}
          status="normal"
          icon={<Clock className="w-4 h-4 text-sky-500" />}
        />
      </div>

      {/* Progress & ML Regression Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card
            title="Tonnage Progress Bar"
            subtitle="Actual earth volume hauled vs dispatch allotment"
            icon={<Target className="w-4 h-4 text-amber-500 dark:text-cat-yellow" />}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Volume Completion:</span>
                <span className="text-amber-600 dark:text-cat-yellow font-extrabold text-base">{pct}%</span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-300/60 dark:border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-cat-yellow h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Actual Time Spent: {task.actual_time_min?.toFixed(0) || 28} min</span>
                <span>Original Estimate: {task.estimated_time_min?.toFixed(0) || 52} min</span>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card
            title="Dispatch Milestone Timeline"
            subtitle="Real-time chronological events"
            icon={<Calendar className="w-4 h-4 text-sky-500" />}
          >
            <div className="space-y-4 text-xs font-mono">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1" />
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block">Task Initialized & Shift Assigned</span>
                  <span className="text-slate-400">{task.actual_start_time || '08:00:00 AM'}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-cat-yellow mt-1 animate-ping-slow" />
                <div>
                  <span className="text-slate-900 dark:text-white font-bold block">Active Excavation Phase ({pct}%)</span>
                  <span className="text-slate-400">Live Telemetry Synchronized</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-700 mt-1" />
                <div>
                  <span className="text-slate-600 dark:text-slate-400 font-bold block">Predicted Target Completion</span>
                  <span className="text-amber-600 dark:text-cat-yellow font-bold">{etaFormatted} (~{remMin} min remaining)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Machine & Operator Specs */}
        <div className="space-y-6">
          <Card
            title="Assignment Details"
            subtitle="Equipment and crew allocation"
            icon={<User className="w-4 h-4 text-slate-400" />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Assigned Machine:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{task.machine_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Assigned Operator:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{task.operator_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Cycle Baseline:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">42 sec / bucket</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Average Payload:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">18.4 tonnes</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Atmosphere / Site:</span>
                <span className="text-slate-700 dark:text-slate-200">North Quarry (Sunny, 24°C)</span>
              </div>
            </div>
          </Card>

          {/* Dynamic ML ETA Attribution Box */}
          {prediction && (
            <Card
              title="ML Regression Attribution"
              subtitle={`Model: ${prediction.model_version}`}
              icon={<Sparkles className="w-4 h-4 text-amber-500 dark:text-cat-yellow" />}
            >
              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Key Dynamic Factors:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {prediction.factors.map((f, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-cat-yellow" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
