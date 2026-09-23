import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HardHat,
  Cpu,
  GraduationCap,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';
import { DEMO_ACTS, DemoAct } from '../demo/DemoController';
import { useRealtime } from '../context/RealtimeContext';
import { Button } from '../components/common/Button';

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeMachineId,
    latestTelemetry,
    safetyStatus,
    derivedHealth,
    failureRisk,
    startStreamSimulator,
    triggerSecurityAlert,
    isSimulating,
  } = useRealtime();

  const [currentActIdx, setCurrentActIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [actElapsedSeconds, setActElapsedSeconds] = useState<number>(0);

  const activeAct = DEMO_ACTS[currentActIdx];

  // Auto-advance timer when playing
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setActElapsedSeconds((prev) => {
          const next = prev + 1;
          const adjustedDuration = Math.ceil(activeAct.durationSeconds / speedMultiplier);
          if (next >= adjustedDuration) {
            // Auto advance
            if (currentActIdx < DEMO_ACTS.length - 1) {
              handleJumpToAct(currentActIdx + 1);
            } else {
              setIsPlaying(false);
            }
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentActIdx, speedMultiplier, activeAct]);

  const handleJumpToAct = async (idx: number) => {
    setCurrentActIdx(idx);
    setActElapsedSeconds(0);
    const act = DEMO_ACTS[idx];

    // Trigger scenario on backend simulator
    try {
      await startStreamSimulator(act.scenario, speedMultiplier * 2.0);
    } catch {
      // ignore
    }

    if (act.triggerAlert) {
      setTimeout(() => {
        triggerSecurityAlert({
          title: 'ACT 3 DEMO: 360° RADAR PERIMETER VIOLATION',
          message:
            'Autonomous obstacle radar detected unauthorized ground personnel in excavator swing quadrant (< 3.2m).',
        });
      }, 1500);
    }
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      handleJumpToAct(currentActIdx);
    }
    setIsPlaying(!isPlaying);
  };

  const handleNextAct = () => {
    if (currentActIdx < DEMO_ACTS.length - 1) {
      handleJumpToAct(currentActIdx + 1);
    }
  };

  const handlePrevAct = () => {
    if (currentActIdx > 0) {
      handleJumpToAct(currentActIdx - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    handleJumpToAct(0);
  };

  const progressPct = Math.min(
    100,
    (actElapsedSeconds / Math.ceil(activeAct.durationSeconds / speedMultiplier)) * 100
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Presentation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Judge & Presentation Mode</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            5-Act Architectural Live Demonstration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Automated walkthrough demonstrating baseline telemetry, ML predictive degradation,
            high-priority safety override, single-task workflow, and hardware-in-the-loop operator training.
          </p>
        </div>

        {/* Master Playback Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={handlePrevAct}
              disabled={currentActIdx === 0}
              className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Act"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'PAUSE DEMO' : 'PLAY TOUR'}</span>
            </button>

            <button
              onClick={handleNextAct}
              disabled={currentActIdx === DEMO_ACTS.length - 1}
              className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Next Act"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-mono">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  speedMultiplier === spd
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Reset Tour"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5-Act Timeline Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {DEMO_ACTS.map((act, idx) => {
          const isActive = idx === currentActIdx;
          const isPassed = idx < currentActIdx;

          return (
            <button
              key={act.id}
              onClick={() => handleJumpToAct(idx)}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500 dark:border-cat-yellow text-slate-900 dark:text-white shadow-md'
                  : isPassed
                  ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-600 dark:text-slate-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              {isActive && isPlaying && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-amber-500 dark:bg-cat-yellow transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              )}

              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                <span
                  className={
                    isActive
                      ? 'text-amber-600 dark:text-cat-yellow'
                      : isPassed
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }
                >
                  Act {act.actNumber}
                </span>
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <span className="font-mono text-slate-400">
                    {Math.ceil(act.durationSeconds / speedMultiplier)}s
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                {act.title.split(':')[1]?.trim() || act.title}
              </h4>
            </button>
          );
        })}
      </div>

      {/* Main Presentation Screen: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Act Context & Architecture Explanation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="industrial-card rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm border-amber-400/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-black tracking-widest text-amber-600 dark:text-cat-yellow">
                  Demonstration Scenario: {activeAct.scenario.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Target Machine: {activeAct.machineId}
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeAct.title}
              </h2>
              <p className="text-sm font-semibold text-amber-600 dark:text-cat-yellow">
                {activeAct.subtitle}
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeAct.description}
            </p>

            {/* Expected Telemetrics Signal Checklist */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Targeted CAN-bus Telemetry Expectations:
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">RPM Profile</span>
                  <strong className="text-slate-900 dark:text-white">
                    {activeAct.expectedSignals.rpm || 'Nominal'}
                  </strong>
                </div>

                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Thermal State</span>
                  <strong className="text-slate-900 dark:text-white">
                    {activeAct.expectedSignals.temperature || 'Normal'}
                  </strong>
                </div>

                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Health Prediction</span>
                  <strong className="text-slate-900 dark:text-white">
                    {activeAct.expectedSignals.health || 'Optimal'}
                  </strong>
                </div>

                <div className="p-2 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Safety Status</span>
                  <strong className="text-slate-900 dark:text-white">
                    {activeAct.expectedSignals.safety || 'Normal'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Key Takeaway Box for Judges */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/50 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
              <Zap className="w-5 h-5 text-amber-600 dark:text-cat-yellow flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-black uppercase tracking-wider block text-[11px]">
                  Hackathon Value & Key Takeaway:
                </strong>
                <p className="mt-0.5 leading-relaxed">{activeAct.keyTakeaway}</p>
              </div>
            </div>

            {/* Act Route Action Button */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate(activeAct.targetRoute)}
                icon={<ExternalLink className="w-4 h-4" />}
                className="font-bold text-xs"
              >
                Inspect Screen for This Act ({activeAct.targetRoute})
              </Button>

              <span className="text-xs font-mono text-slate-400">
                {isSimulating ? 'Simulator Active' : 'Simulator Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Live Telemetry Monitor & Fast Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="industrial-card rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Live Stream Signals ({activeMachineId})
                </h3>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                1 Hz Realtime
              </span>
            </div>

            {/* Live Signals Gauge Stack */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Engine RPM:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {latestTelemetry?.rpm ?? 0} RPM
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Hydraulic Pressure:</span>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {latestTelemetry?.hydraulic_pressure ?? 0} bar
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Hydraulic Temp:</span>
                <span
                  className={`font-bold text-sm ${
                    (latestTelemetry?.hydraulic_temp ?? 0) > 90
                      ? 'text-rose-500'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {latestTelemetry?.hydraulic_temp?.toFixed(1) ?? '0.0'}°C
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">ML Failure Probability:</span>
                <span
                  className={`font-bold text-sm ${
                    (failureRisk?.probability ?? 0) > 0.6
                      ? 'text-rose-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {((failureRisk?.probability ?? 0) * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Safety Perimeter:</span>
                <span
                  className={`font-bold text-sm ${
                    safetyStatus.proximity ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {safetyStatus.proximity ? 'ALERT (< 3.5m)' : 'CLEAR'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">Seatbelt Latch:</span>
                <span
                  className={`font-bold text-sm ${
                    safetyStatus.seatbelt ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {safetyStatus.seatbelt ? 'FASTENED' : 'UNBUCKLED'}
                </span>
              </div>
            </div>

            {/* Quick Demonstration Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Quick Judge Test Triggers:
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    triggerSecurityAlert({
                      title: 'MANUAL TRIGGER: PERIMETER SECURITY ALERT',
                      message: 'Demonstration siren activated directly from judge control room.',
                    })
                  }
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  Trigger Siren Alert
                </button>

                <button
                  onClick={() => navigate('/training')}
                  className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-cat-yellow border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Training Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DemoPage;
