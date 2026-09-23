import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Award,
  RotateCcw,
  LayoutDashboard,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { getModuleById } from '../training/definitions';
import { TrainingAttempt } from '../training/types';
import { TrainingStorage } from '../training/persistence/trainingStorage';
import { ScoreBreakdownView } from '../components/training/TrainingScore/ScoreBreakdownView';
import { ReadinessBadgeModal } from '../components/training/ReadinessBadge/ReadinessBadgeModal';
import { Button } from '../components/common/Button';

export const TrainingResultPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);

  const module = moduleId ? getModuleById(moduleId) : undefined;

  // Retrieve attempt from state or local storage
  const stateAttempt = (location.state as { attempt?: TrainingAttempt })?.attempt;
  const storedAttempts = moduleId ? TrainingStorage.getAttempts(moduleId) : [];
  const attempt = stateAttempt || storedAttempts[storedAttempts.length - 1];

  if (!module) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          Training Module Not Found
        </h2>
        <Button
          variant="primary"
          onClick={() => navigate('/training')}
          icon={<GraduationCap className="w-4 h-4" />}
        >
          Return to Training Hub
        </Button>
      </div>
    );
  }

  if (!attempt || !attempt.scoreBreakdown) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          No Verification Record Found
        </h2>
        <p className="text-sm text-slate-500">
          You haven't completed a hardware run for this module yet.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate(`/training/${module.id}/run`)}
          icon={<RotateCcw className="w-4 h-4" />}
        >
          Start Hardware Training
        </Button>
      </div>
    );
  }

  const { scoreBreakdown } = attempt;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => navigate('/training')}
            className="hover:text-amber-600 dark:hover:text-cat-yellow cursor-pointer"
          >
            Training Hub
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(`/training/${module.machineType}`)}
            className="hover:text-amber-600 dark:hover:text-cat-yellow cursor-pointer"
          >
            {module.machineName}
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Assessment Results
          </span>
        </div>

        <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          Attempt #{attempt.attemptId.slice(-6)}
        </span>
      </div>

      {/* Hero Result Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 border-2 transition-all ${
          scoreBreakdown.isReady
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
            : 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl flex-shrink-0 ${
                scoreBreakdown.isReady
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              }`}
            >
              {scoreBreakdown.isReady ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <RotateCcw className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider block opacity-80">
                Evaluation Outcome
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {scoreBreakdown.isReady
                  ? 'Operator Readiness Confirmed'
                  : 'Re-Training Required to Qualify'}
              </h1>
              <p className="text-xs sm:text-sm opacity-90 max-w-xl">
                {scoreBreakdown.isReady
                  ? 'Hardware validation criteria met. You have demonstrated competent in-cab sequence adherence and safety control under real-time telemetry conditions.'
                  : 'Your overall score fell below the 80% readiness benchmark. Review the step audit breakdown below and retake the hardware verification run.'}
              </p>
            </div>
          </div>

          {scoreBreakdown.isReady && attempt.badge && (
            <div className="flex-shrink-0">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowBadgeModal(true)}
                icon={<Award className="w-5 h-5 text-slate-950" />}
                className="w-full sm:w-auto font-black shadow-lg shadow-amber-500/20"
              >
                View Readiness Badge
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Transparent 100-Point Score Breakdown */}
      <ScoreBreakdownView
        score={scoreBreakdown}
        moduleTitle={module.title}
        machineName={module.machineName}
      />

      {/* Step Audit Verification Log */}
      <div className="industrial-card rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-500 dark:text-cat-yellow" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Step Verification Audit Trail
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {attempt.stepResults.length} / {module.steps.length} Steps Verified
          </span>
        </div>

        <div className="space-y-2.5">
          {module.steps.map((step) => {
            const result = attempt.stepResults.find((r) => r.stepId === step.id);
            const isPassed = !!(result?.isPassed ?? result?.allRulesPassed);

            return (
              <div
                key={step.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 gap-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                      isPassed
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.sequence}
                  </span>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {step.instruction}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center font-mono text-xs">
                  {result && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{result.elapsedSeconds}s</span>
                    </div>
                  )}

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      isPassed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {isPassed ? 'VERIFIED' : 'FAILED'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/training')}
            icon={<GraduationCap className="w-4 h-4" />}
          >
            Training Hub
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate(`/training/${module.machineType}`)}
          >
            Machine Curriculum
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate(`/training/${module.id}/run`)}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Retake Run
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            icon={<LayoutDashboard className="w-4 h-4" />}
          >
            In-Cab Cockpit
          </Button>
        </div>
      </div>

      {/* Digital Operator Readiness Badge Modal */}
      <ReadinessBadgeModal
        badge={attempt.badge ?? null}
        isOpen={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
      />
    </div>
  );
};
export default TrainingResultPage;
