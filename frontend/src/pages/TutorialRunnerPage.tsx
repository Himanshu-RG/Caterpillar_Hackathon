import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Play,
  RotateCcw,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { getModuleById } from '../training/definitions';
import { StepEvaluationResult, StepState, TrainingAttempt } from '../training/types';
import { TutorialValidationEngine } from '../training/validation/TutorialValidationEngine';
import { TrainingScorer } from '../training/scoring/trainingScorer';
import { TrainingStorage } from '../training/persistence/trainingStorage';
import { SignalMonitor } from '../components/training/SignalMonitor/SignalMonitor';
import { ValidationIndicator } from '../components/training/ValidationIndicator/ValidationIndicator';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useRealtime } from '../context/RealtimeContext';

export const TutorialRunnerPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const {
    activeMachineId,
    operator,
    latestTelemetry,
    safetyStatus,
    connectionStatus,
    isSimulating,
    startStreamSimulator,
  } = useRealtime();

  const module = getModuleById(moduleId || 'cat320-startup');

  // State Machine: current active step index (0-indexed)
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [stepStates, setStepStates] = useState<StepState[]>([]);
  const [stepEvaluation, setStepEvaluation] = useState<StepEvaluationResult | null>(null);
  const [completedResults, setCompletedResults] = useState<StepEvaluationResult[]>([]);

  // Step timing & safety metrics
  const [stepElapsedSeconds, setStepElapsedSeconds] = useState<number>(0);
  const [safetyInterruption, setSafetyInterruption] = useState<string | null>(null);
  const [safetyViolationsCount, setSafetyViolationsCount] = useState<number>(0);

  const stepTimerRef = useRef<any>(null);
  const currentStepIdxRef = useRef<number>(currentStepIdx);
  currentStepIdxRef.current = currentStepIdx;

  // Initialize step states
  useEffect(() => {
    if (!module) return;
    const initialStates: StepState[] = module.steps.map((_, idx) =>
      idx === 0 ? 'WAITING' : 'LOCKED'
    );
    setStepStates(initialStates);
    setCurrentStepIdx(0);
    setCompletedResults([]);
    setStepElapsedSeconds(0);
    setSafetyViolationsCount(0);
  }, [module]);

  // Step Elapsed Seconds Timer
  useEffect(() => {
    if (safetyInterruption) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      return;
    }

    stepTimerRef.current = setInterval(() => {
      setStepElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [safetyInterruption]);

  // Handle Safety Override Priority (Safety takes precedence over training)
  useEffect(() => {
    if (safetyStatus.proximity) {
      setSafetyInterruption('Proximity radar detected obstacle or ground personnel inside perimeter.');
      setSafetyViolationsCount((prev) => prev + 1);
    } else if (!safetyStatus.seatbelt && currentStepIdx > 0) {
      setSafetyInterruption('Seatbelt unfastened while operating machine controls.');
      setSafetyViolationsCount((prev) => prev + 1);
    }
  }, [safetyStatus, currentStepIdx]);

  // Construct artificial packet from latest telemetry and safety context
  const currentTelemetryPacket = React.useMemo(() => {
    if (!latestTelemetry) return null;
    return {
      timestamp: new Date().toISOString(),
      machine_id: activeMachineId,
      telemetry: latestTelemetry,
      safety: safetyStatus,
      predictions: {
        failure_probability: 0.1,
        risk_level: 'LOW' as const,
        signals: [],
        unsafe_probability_30m: 0.05,
      },
      insights: [],
    };
  }, [latestTelemetry, safetyStatus, activeMachineId]);

  // Reactive Step Evaluation using Declarative TutorialValidationEngine
  useEffect(() => {
    if (!module) return;
    if (safetyInterruption) return; // Paused during safety hazard

    const step = module.steps[currentStepIdx];
    if (!step) return;

    const currentState = stepStates[currentStepIdx] || 'WAITING';

    // If step is already completed, do not re-evaluate
    if (currentState === 'COMPLETED') return;

    const evalResult = TutorialValidationEngine.evaluateStep(
      step,
      currentTelemetryPacket,
      currentState,
      stepElapsedSeconds
    );

    setStepEvaluation(evalResult);

    if (evalResult.allRulesPassed) {
      // Step verified! Update state machine
      setStepStates((prev) => {
        const next = [...prev];
        next[currentStepIdx] = 'COMPLETED';
        return next;
      });

      // Archive completed result
      setCompletedResults((prev) => {
        const filtered = prev.filter((r) => r.stepId !== step.id);
        return [...filtered, evalResult];
      });
    }
  }, [
    currentTelemetryPacket,
    currentStepIdx,
    module,
    stepStates,
    stepElapsedSeconds,
    safetyInterruption,
  ]);

  // Proceed to next step or complete module
  const handleAdvanceStep = useCallback(() => {
    if (!module) return;

    const isFinalStep = currentStepIdx === module.steps.length - 1;

    if (isFinalStep) {
      // Module Complete! Calculate score and persist
      const finalResults = [...completedResults];
      if (stepEvaluation && !finalResults.some((r) => r.stepId === stepEvaluation.stepId)) {
        finalResults.push(stepEvaluation);
      }

      const scoreBreakdown = TrainingScorer.calculateScore(
        module.steps,
        finalResults,
        safetyViolationsCount
      );

      const attempt: TrainingAttempt = {
        attemptId: `ATT-${Date.now()}`,
        moduleId: module.id,
        startedAt: new Date(Date.now() - scoreBreakdown.totalTimeSeconds * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        scoreBreakdown,
        stepResults: finalResults,
      };

      if (scoreBreakdown.isReady) {
        attempt.badge = {
          badgeId: `BDG-${Date.now()}`,
          moduleId: module.id,
          moduleTitle: module.title,
          machineName: module.machineName,
          operatorId: operator.id,
          operatorName: operator.name,
          score: scoreBreakdown.totalScore,
          completedDate: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          status: 'READY',
          attemptsCount: 1,
          isDemoRecord: true,
        };
        TrainingStorage.saveBadge(attempt.badge);
      }

      TrainingStorage.saveAttempt(attempt);
      TrainingStorage.clearActiveProgress();

      // Navigate to results
      navigate(`/training/${module.id}/result`, { state: { attempt } });
    } else {
      // Unlock and advance to next step
      const nextIdx = currentStepIdx + 1;
      setStepStates((prev) => {
        const next = [...prev];
        next[nextIdx] = 'WAITING';
        return next;
      });
      setCurrentStepIdx(nextIdx);
      setStepElapsedSeconds(0);
      setStepEvaluation(null);
    }
  }, [
    module,
    currentStepIdx,
    completedResults,
    stepEvaluation,
    safetyViolationsCount,
    operator,
    navigate,
  ]);

  if (!module) {
    return <div className="p-8 text-center text-slate-400">Training module not found.</div>;
  }

  const activeStep = module.steps[currentStepIdx];
  const isCurrentStepPassed = stepStates[currentStepIdx] === 'COMPLETED';
  const isFinalStep = currentStepIdx === module.steps.length - 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. In-Cab Safety Override Alert Prompt (Highest Priority) */}
      {safetyInterruption && (
        <div className="rounded-2xl border-4 border-rose-500 bg-slate-950 p-6 shadow-2xl text-white space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="rounded bg-rose-600 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider">
                SAFETY INTERRUPTION
              </span>
              <h3 className="text-xl font-black text-rose-200 mt-1">
                Interactive Training Paused
              </h3>
            </div>
          </div>

          <p className="text-sm font-semibold text-rose-100 bg-rose-950/60 p-4 rounded-xl border border-rose-800 leading-relaxed">
            {safetyInterruption}
          </p>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-rose-300 font-mono">
              Machine safety protocol must be addressed before continuing validation.
            </span>
            <Button
              variant="danger"
              size="md"
              className="font-black text-xs uppercase"
              onClick={() => setSafetyInterruption(null)}
            >
              Acknowledge & Resume Training
            </Button>
          </div>
        </div>
      )}

      {/* 2. Top Header & Runner Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-cat-border/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/training/${module.id}`)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Exit tutorial runner"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow">
                Hardware-in-the-Loop Runner
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs font-mono text-slate-500">
                Machine: <strong>{activeMachineId}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {module.title}
            </h1>
          </div>
        </div>

        {/* Live Simulator Sync & Telemetry Status */}
        <div className="flex items-center gap-3">
          {!isSimulating && (
            <Button
              variant="primary"
              size="sm"
              className="font-bold text-xs uppercase cursor-pointer"
              icon={<Play className="w-3.5 h-3.5 fill-slate-950" />}
              onClick={() => startStreamSimulator('healthy')}
            >
              Start Stream Simulation
            </Button>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-xs font-mono">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {connectionStatus === 'CONNECTED' ? 'CAN-BUS LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sequenced Step Progress Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {module.steps.map((st, idx) => {
          const state = stepStates[idx] || 'LOCKED';
          const isActive = idx === currentStepIdx;
          const isDone = state === 'COMPLETED';

          return (
            <div
              key={st.id}
              className={`p-3 rounded-xl border transition-all text-xs font-mono flex items-center justify-between gap-2 ${
                isDone
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                  : isActive
                  ? 'border-amber-400 dark:border-cat-yellow bg-amber-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold ring-2 ring-amber-400/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : isActive ? (
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                    {st.sequence}
                  </span>
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
                <span className="truncate">Step {st.sequence}: {st.title}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Main Hardware Validation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Active Step Card & Hardware Signal Monitor */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active Step Card */}
          <div className="industrial-card rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm border-amber-400/80 dark:border-cat-yellow/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow block">
                  STEP {activeStep.sequence} OF {module.steps.length}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {activeStep.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <Clock className="w-3.5 h-3.5" />
                <span>Elapsed: {stepElapsedSeconds}s</span>
              </div>
            </div>

            {/* In-Cab Instruction Callout */}
            <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
              &ldquo;{activeStep.instruction}&rdquo;
            </div>

            {activeStep.safetyNote && (
              <div className="rounded-xl p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold uppercase text-[10px] block">Safety Notice:</strong>
                  <span>{activeStep.safetyNote}</span>
                </div>
              </div>
            )}

            {/* Hardware Signal Monitor */}
            <SignalMonitor
              currentStep={activeStep}
              evaluationResult={stepEvaluation}
              isEvaluating={!isCurrentStepPassed}
            />
          </div>

          {/* Step Verified Banner with Audio Chime & Action */}
          <ValidationIndicator
            isVisible={isCurrentStepPassed}
            stepTitle={activeStep.title}
            onContinue={handleAdvanceStep}
            isFinalStep={isFinalStep}
          />
        </div>

        {/* Right 4 Cols: Compact In-Cab Telemetry Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="industrial-card rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Live Machine State
              </span>
              <span className="font-mono text-xs text-amber-600 dark:text-cat-yellow font-bold">
                {activeMachineId}
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Engine RPM:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {latestTelemetry?.rpm ?? 0} RPM
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Engine Load:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {latestTelemetry?.load_pct ?? 0}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Hydraulic Pressure:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {latestTelemetry?.hydraulic_pressure ?? 0} bar
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Hydraulic Temp:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {latestTelemetry?.hydraulic_temp?.toFixed(1) ?? '0.0'}°C
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Seatbelt Status:</span>
                <span
                  className={`font-bold text-sm ${
                    safetyStatus.seatbelt ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {safetyStatus.seatbelt ? 'FASTENED' : 'UNFASTENED'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Bucket Payload:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {latestTelemetry?.payload_tonnes?.toFixed(1) ?? '0.0'} t
                </span>
              </div>
            </div>

            {/* AI Assistant In-Training Hint */}
            <div className="rounded-xl p-3 bg-amber-50/70 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-bold uppercase text-amber-700 dark:text-cat-yellow mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Coach Advice:</span>
              </div>
              <span>
                {activeStep.sequence === 1
                  ? 'Ensure your seatbelt is firmly latched in cab before cranking the engine starter.'
                  : activeStep.sequence === 2
                  ? 'Push the red lockout lever forward to charge pilot circuits above 35 bar.'
                  : 'Modulate joystick travel smoothly to observe hydraulic cylinder response.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
