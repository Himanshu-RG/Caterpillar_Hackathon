import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ShieldAlert, Cpu, BookOpen, Clock, BarChart2 } from 'lucide-react';
import { getModuleById } from '../training/definitions';
import { VideoPlayer } from '../components/training/VideoPlayer/VideoPlayer';
import { SOPViewer } from '../components/training/SOPViewer/SOPViewer';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

interface TrainingDetailPageProps {
  moduleIdOverride?: string;
}

export const TrainingDetailPage: React.FC<TrainingDetailPageProps> = ({ moduleIdOverride }) => {
  const { moduleId: routeId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const activeId = moduleIdOverride || routeId || 'cat320-startup';
  const module = getModuleById(activeId);

  if (!module) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Training module not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/training')}>
          Back to Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-cat-border/60">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate(`/training/${module.machineType}`)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer mt-1"
            title="Back to curriculum"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow">
                {module.machineName}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-semibold text-slate-500">
                Module: {module.id}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {module.title}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {module.description}
            </p>
          </div>
        </div>

        {/* Start Interactive Mode CTA Button */}
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto font-black text-xs uppercase tracking-wider py-4 shadow-lg shadow-amber-500/20 cursor-pointer"
            icon={<Play className="w-4 h-4 fill-slate-950" />}
            onClick={() => navigate(`/training/${module.id}/run`)}
          >
            Start Interactive Mode
          </Button>
        </div>
      </div>

      {/* Module Overview Metadata Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="industrial-card rounded-xl p-3 text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Time</span>
          <strong className="text-slate-900 dark:text-white text-sm font-mono">
            {module.durationMinutes} minutes
          </strong>
        </div>

        <div className="industrial-card rounded-xl p-3 text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Difficulty Level</span>
          <strong className="text-slate-900 dark:text-white text-sm">
            {module.difficulty}
          </strong>
        </div>

        <div className="industrial-card rounded-xl p-3 text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Validation Mode</span>
          <strong className="text-amber-600 dark:text-cat-yellow text-sm">
            Hardware Interactive
          </strong>
        </div>

        <div className="industrial-card rounded-xl p-3 text-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Certification Target</span>
          <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
            Readiness Badge (&gt;=80%)
          </strong>
        </div>
      </div>

      {/* Split Grid: Video Player Walkaround (Left) & Written SOP (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Video Walkthrough */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Interactive Video Walkthrough
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Step-by-step visual demonstration
            </span>
          </div>

          <VideoPlayer title={module.title} machineName={module.machineName} />

          <div className="rounded-xl border border-amber-300/60 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <strong className="font-bold block uppercase text-[10px]">
              Hardware Interactive Guidance:
            </strong>
            <p className="leading-relaxed">
              When you click <strong>&quot;Start Interactive Mode&quot;</strong>, the interface connects directly to your machine&apos;s CAN-bus telemetry stream. Each physical action (seatbelt click, starter key, joystick curl) will be verified in real time before advancing.
            </p>
          </div>
        </div>

        {/* Right 5 Cols: Standard Operating Procedure (SOP) */}
        <div className="lg:col-span-5">
          <SOPViewer steps={module.steps} />
        </div>
      </div>
    </div>
  );
};
