import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Gauge,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  Zap,
  CheckCircle2,
  Cpu,
  AlertTriangle,
  Play,
  Pause,
  AlertOctagon,
  CheckSquare,
  ArrowRight,
  Flame,
  ChevronDown,
  ChevronUp,
  Radio,
  Square,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { fetchTodaysTasks } from '../api/tasks';
import { Task } from '../types/telematics';
import { LiveTelemetryChart } from '../components/charts/LiveTelemetryChart';

export const DashboardPage: React.FC = () => {
  const {
    activeMachineId,
    operator,
    dashboard,
    latestTelemetry,
    derivedHealth,
    safetyStatus,
    currentTask,
    startTask,
    pauseCurrentTask,
    completeCurrentTask,
    triggerSecurityAlert,
    isSimulating,
    startStreamSimulator,
    toggleStreamSimulator,
    activeScenario,
  } = useRealtime();

  // Tasks state for Important Priority Queue
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Load priority tasks
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const tasks = await fetchTodaysTasks(40);
        if (isMounted) {
          setAllTasks(tasks);
        }
      } catch (err) {
        console.warn('Could not load priority tasks:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter 2-3 High Importance tasks for this machine/operator
  const priorityTasks: Task[] = React.useMemo(() => {
    // Exclude currently running task if any
    const available = allTasks.filter((t) => {
      const isFinished = t.actual_quantity_tonnes >= t.planned_quantity_tonnes;
      const isCurrent = currentTask && t.task_id === currentTask.task_id;
      return !isFinished && !isCurrent;
    });

    // Prefer tasks assigned to this machine or general priority
    const machineSpecific = available.filter((t) => t.machine_id === activeMachineId);
    if (machineSpecific.length >= 2) {
      return machineSpecific.slice(0, 3);
    }
    // Fallback combined with general queue
    return [...machineSpecific, ...available.filter((t) => t.machine_id !== activeMachineId)].slice(0, 3);
  }, [allTasks, currentTask, activeMachineId]);

  const machineModel = dashboard?.machine?.machine_model || '320 GC Excavator';
  const hours = dashboard?.current_state?.engine_hours || 1284;
  const fuelLiters = dashboard?.current_state?.fuel_level_l ?? 268;
  const fuelPct = Math.round((fuelLiters / 400) * 100);

  // Real-time instantaneous values
  const rpm = latestTelemetry?.rpm ?? dashboard?.current_state?.engine_rpm ?? 1650;
  const loadPct = latestTelemetry?.load_pct ?? dashboard?.current_state?.engine_load_pct ?? 54;
  const hydTemp = latestTelemetry?.hydraulic_temp ?? dashboard?.current_state?.hydraulic_temp_c ?? 68.5;
  const hydPress = latestTelemetry?.hydraulic_pressure ?? dashboard?.current_state?.hydraulic_pressure_bar ?? 240;
  const oilPress = latestTelemetry?.oil_pressure ?? dashboard?.current_state?.oil_pressure_bar ?? 3.9;
  const coolantTemp = latestTelemetry?.coolant_temp ?? dashboard?.current_state?.coolant_temp_c ?? 82.0;
  const speed = latestTelemetry?.speed_kmh ?? dashboard?.current_state?.speed_kmh ?? 2.2;

  // Simple Plain-English Health Classification
  const isHydHot = hydTemp >= 80;
  const isOilLow = oilPress < 2.8;
  const isCoolantHot = coolantTemp > 90;
  const isSafetyHazard = safetyStatus.proximity || !safetyStatus.seatbelt || safetyStatus.overspeed;
  const hasHealthWarning =
    isHydHot ||
    isOilLow ||
    isCoolantHot ||
    derivedHealth?.health_status === 'CRITICAL' ||
    derivedHealth?.health_status === 'ATTENTION' ||
    (derivedHealth?.active_anomalies && derivedHealth.active_anomalies.length > 0);

  // Estimated fuel remaining runtime (at ~8.4L/hr avg)
  const estimatedFuelHours = (fuelLiters / 8.4).toFixed(1);

  // Task metrics calculation if a task is ongoing
  const plannedTonnes = currentTask?.planned_quantity_tonnes || 120;
  const completedTonnes = currentTask?.actual_quantity_tonnes || 78;
  const progressPct = Math.min(100, Math.round((completedTonnes / plannedTonnes) * 100));
  const remainingTonnes = Math.max(0, plannedTonnes - completedTonnes);
  const remainingMinutes = Math.max(5, Math.round((currentTask?.estimated_time_min || 45) * (remainingTonnes / plannedTonnes)));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header: Operator Identity, Machine State & Security Alert Test */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-cat-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow">
              Operator Cockpit
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {operator.shift}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>{operator.name}</span>
            <span className="text-slate-400 text-lg font-normal">({operator.id})</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-amber-600 dark:text-cat-yellow font-mono text-xl">{activeMachineId}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {machineModel} · Site: {dashboard?.machine?.site_id || 'SITE_QUARRY_NORTH'} · Single-Machine Assignment
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Machine Working Status Badge */}
          {currentTask ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
              <span>WORKING · ON TASK</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>STANDBY · IDLE</span>
            </div>
          )}

          {/* Mimic Real-Time Data Stream Button & Scenario Picker */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border p-1">
            <button
              onClick={() => toggleStreamSimulator()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isSimulating
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
              }`}
              title={
                isSimulating
                  ? `Stop streaming telematics for ${activeMachineId}`
                  : `Start streaming live simulated telematics for ${activeMachineId}`
              }
            >
              {isSimulating ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
                  </span>
                  <Square className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Streaming Live</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>Mimic Data Stream</span>
                </>
              )}
            </button>

            {/* Quick Scenario Selector */}
            <select
              value={activeScenario}
              onChange={(e) => startStreamSimulator(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1 py-1"
              title="Select simulation pattern for the chosen machine"
            >
              <option value="healthy" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Healthy Nominal (Happy Path)
              </option>
              <option value="degrading" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Degrading Thermal (Predictive Maintenance)
              </option>
              <option value="unsafe" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Unsafe Operation (Safety Alert)
              </option>
              <option value="productivity" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                High Productivity
              </option>
              <option value="excessive_idle" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Excessive Idle (Eco Tip)
              </option>
            </select>
          </div>

          {/* Active Hazard Indicator Button (opens the Security Alert Modal in front of screen) */}
          {isSafetyHazard && (
            <button
              onClick={() =>
                triggerSecurityAlert({
                  title: !safetyStatus.seatbelt
                    ? 'IMMEDIATE SAFETY ALERT: SEATBELT UNFASTENED'
                    : 'SECURITY ALERT: OBSTACLE IN SWING RADIUS',
                  message: !safetyStatus.seatbelt
                    ? 'Seatbelt is unfastened while machine is active. Fasten safety harness before operating hydraulics.'
                    : 'Proximity radar detected an obstacle or personnel in close proximity (< 3.5m).',
                  recommended_action: !safetyStatus.seatbelt
                    ? 'Fasten safety harness immediately before operating machine.'
                    : 'Halt machine motion immediately and verify 360° clearance.',
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider animate-pulse shadow-md shadow-rose-600/30 cursor-pointer"
              title="Click to view full Security Alert prompt box"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>SAFETY HAZARD ACTIVE · VIEW PROMPT</span>
            </button>
          )}

          {/* Red Security Alert Test Button */}
          <button
            onClick={() =>
              triggerSecurityAlert({
                title: 'SECURITY ALERT: UNAUTHORIZED PERSONNEL DETECTED',
                message: 'Personnel detected inside heavy equipment swing perimeter (< 4.0m) without high-visibility beacon.',
                recommended_action: 'HALT MACHINE MOTION IMMEDIATELY. Sound in-cab horn, engage safety brake, and notify quarry supervisor.',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/30 cursor-pointer"
            title="Click to trigger emergency security alert prompt and alarm sound"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Test Security Alert</span>
          </button>
        </div>
      </div>

      {/* 3. CURRENT STATS OF THE MACHINE (Clean, Big, Glanceable Gauges) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Current Machine Stats
          </h2>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Live Telematics Stream
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gauge 1: Fuel Level */}
          <div className="industrial-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fuel Level
              </span>
              <Fuel className="w-5 h-5 text-amber-500" />
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono-num text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {fuelPct}%
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  ({fuelLiters.toFixed(0)} L remaining)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    fuelPct < 25 ? 'bg-rose-500' : fuelPct < 40 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${fuelPct}%` }}
                />
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Operating Time</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                ~{estimatedFuelHours} hrs remaining
              </span>
            </div>
          </div>

          {/* Gauge 2: Hydraulics */}
          <div className="industrial-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hydraulics
              </span>
              <Thermometer className={`w-5 h-5 ${isHydHot ? 'text-rose-500' : 'text-amber-500'}`} />
            </div>
            <div className="my-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-mono-num text-3xl sm:text-4xl font-black ${
                      isHydHot ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {hydTemp.toFixed(1)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">°C</span>
                </div>
                <Badge variant={isHydHot ? 'danger' : 'success'} size="sm">
                  {isHydHot ? 'TOO WARM' : 'NORMAL'}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
                Line Pressure: <span className="font-bold text-slate-800 dark:text-slate-200">{hydPress.toFixed(0)} bar</span>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Safe Range</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">50°C – 80°C</span>
            </div>
          </div>

          {/* Gauge 3: Engine Load & RPM */}
          <div className="industrial-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Engine Load
              </span>
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div className="my-1">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-num text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                    {loadPct.toFixed(0)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">%</span>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {rpm} RPM
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    loadPct > 85 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${loadPct}%` }}
                />
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Oil Pressure</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {oilPress.toFixed(1)} bar (Normal)
              </span>
            </div>
          </div>

          {/* Gauge 4: Ground Speed & Hours */}
          <div className="industrial-card rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ground Speed
              </span>
              <Activity className="w-5 h-5 text-teal-500" />
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono-num text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {speed.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">km/h</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Safe work speed limit: <strong>8.0 km/h</strong>
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Machine Runtime</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {hours.toFixed(0)} operating hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CURRENT ONGOING TASK (OR IDLE IF NONE) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Current Work Assignment (Operator Handles 1 Task)
          </h2>
          {currentTask && (
            <Badge variant="warning" size="sm">
              SINGLE ACTIVE TASK
            </Badge>
          )}
        </div>

        {currentTask ? (
          /* Active Ongoing Task Card */
          <div className="industrial-card rounded-2xl p-5 md:p-6 shadow-md border-amber-400/80 dark:border-cat-yellow/60">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-amber-500 dark:bg-cat-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-950">
                    ON-GOING TASK
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    ID: {currentTask.task_id}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  {currentTask.task_type}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Machine: <strong className="text-slate-800 dark:text-slate-200">{activeMachineId}</strong> · Operator: <strong className="text-slate-800 dark:text-slate-200">{operator.name}</strong>
                </p>
              </div>

              {/* Action Buttons for Current Task */}
              <div className="flex items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-bold text-xs"
                  icon={<Pause className="w-3.5 h-3.5" />}
                  onClick={pauseCurrentTask}
                  title="Pause task and return machine to idle state"
                >
                  Pause (Go Idle)
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-black text-xs uppercase"
                  icon={<CheckCircle2 className="w-4 h-4 text-slate-950" />}
                  onClick={completeCurrentTask}
                >
                  Mark Completed
                </Button>
              </div>
            </div>

            {/* Giant High-Contrast Progress Bar */}
            <div className="space-y-2 mb-5">
              <div className="flex items-baseline justify-between text-xs sm:text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Target Progress: {completedTonnes.toFixed(0)} of {plannedTonnes.toFixed(0)} Tonnes
                </span>
                <span className="font-mono-num font-black text-amber-600 dark:text-cat-yellow text-base">
                  {progressPct}% Completed
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-cat-yellow h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{remainingTonnes.toFixed(0)} tonnes remaining</span>
                <span>Planned Target: {plannedTonnes.toFixed(0)} t</span>
              </div>
            </div>

            {/* Glanceable ETA Banner */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-cat-border p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-slate-800 text-amber-600 dark:text-cat-yellow flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Estimated Time Left
                  </span>
                  <span className="font-mono-num text-lg font-black text-slate-900 dark:text-white">
                    ~{remainingMinutes} minutes
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Pacing Status
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  On Schedule · Optimal Cycle Speed
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Idle Machine Card */
          <div className="industrial-card rounded-2xl p-8 text-center shadow-sm border-dashed border-2 border-slate-300 dark:border-slate-700">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Machine is Currently Idle
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              No task is currently running. Select an important work order below to begin your next assignment.
            </p>
            {priorityTasks.length > 0 && (
              <Button
                variant="primary"
                size="md"
                className="font-black text-xs uppercase mx-auto"
                icon={<Play className="w-4 h-4 fill-slate-950 text-slate-950" />}
                onClick={() => startTask(priorityTasks[0])}
              >
                Start Priority Task: {priorityTasks[0].task_type}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 5. IMPORTANT TASKS (HIGH IMPORTANCE ONLY - NOT ALL 50 TASKS) & MACHINE HEALTH (SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Priority Tasks List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Important Tasks (High Priority Queue)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Top upcoming dispatches for {activeMachineId}. Click to start.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 dark:text-cat-yellow">
              {priorityTasks.length} Priority Tasks
            </span>
          </div>

          {priorityTasks.length === 0 ? (
            <div className="industrial-card rounded-2xl p-6 text-center text-slate-400 text-xs">
              No priority tasks scheduled in queue.
            </div>
          ) : (
            <div className="space-y-3">
              {priorityTasks.map((t, index) => {
                const planned = t.planned_quantity_tonnes || 100;
                const estMin = t.estimated_time_min?.toFixed(0) || '45';
                const isUrgent = index === 0;

                return (
                  <div
                    key={t.task_id}
                    className="industrial-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-amber-400 dark:hover:border-cat-yellow/60 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={isUrgent ? 'danger' : 'warning'} size="sm">
                          {isUrgent ? 'URGENT PRIORITY' : 'HIGH IMPORTANCE'}
                        </Badge>
                        <span className="font-mono text-xs text-slate-400">
                          {t.task_id}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.task_type}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>Target: <strong>{planned.toFixed(0)} Tonnes</strong></span>
                        <span>·</span>
                        <span>Est. Duration: <strong>{estMin} min</strong></span>
                      </div>
                    </div>

                    <Button
                      variant={currentTask?.task_id === t.task_id ? 'secondary' : 'primary'}
                      size="sm"
                      className="font-bold text-xs uppercase flex-shrink-0 cursor-pointer"
                      icon={
                        currentTask?.task_id === t.task_id ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        )
                      }
                      onClick={() => startTask(t)}
                    >
                      {currentTask?.task_id === t.task_id ? 'Currently Active' : 'Start Task'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Plain-English Machine Health */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Machine Health
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Current operational condition
            </p>
          </div>

          <div className="industrial-card rounded-2xl p-5 space-y-4 shadow-sm">
            {/* Overall Machine Health Banner */}
            <div
              className={`rounded-xl p-3.5 text-xs font-bold flex items-center gap-2.5 ${
                hasHealthWarning
                  ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {hasHealthWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              )}
              <span>
                {isHydHot && isOilLow
                  ? `Warning: Hydraulic temp elevated (${hydTemp.toFixed(1)}°C) & oil pressure dropping (${oilPress.toFixed(1)} bar). High component failure risk.`
                  : isHydHot
                  ? `Warning: Hydraulic temperature elevated (${hydTemp.toFixed(1)}°C). Thermal stress above safe benchmark.`
                  : isOilLow
                  ? `Warning: Engine oil pressure low (${oilPress.toFixed(1)} bar). Inspect lubrication system.`
                  : isCoolantHot
                  ? `Warning: Engine coolant temperature high (${coolantTemp.toFixed(1)}°C).`
                  : hasHealthWarning
                  ? 'Advisory: Thermal or mechanical telemetry drift detected. Monitor during heavy breakout.'
                  : 'Machine Healthy: All systems nominal and certified safe to operate.'}
              </span>
            </div>

            {/* 4-Point Plain English Checklist */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Engine System:</span>
                <span
                  className={`font-bold ${
                    isCoolantHot ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isCoolantHot
                    ? `High Temp (${coolantTemp.toFixed(1)}°C)`
                    : `Optimal (Coolant ${coolantTemp.toFixed(1)}°C)`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Hydraulic Circuit:</span>
                <span
                  className={`font-bold ${
                    isHydHot ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isHydHot ? `Elevated (${hydTemp.toFixed(1)}°C)` : `Normal (${hydTemp.toFixed(1)}°C)`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Oil & Lubrication:</span>
                <span
                  className={`font-bold ${
                    isOilLow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isOilLow ? `Low Pressure (${oilPress.toFixed(1)} bar)` : `Good Pressure (${oilPress.toFixed(1)} bar)`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Safety Sensors:</span>
                {isSafetyHazard ? (
                  <button
                    onClick={() =>
                      triggerSecurityAlert({
                        title: !safetyStatus.seatbelt
                          ? 'IMMEDIATE SAFETY ALERT: SEATBELT UNFASTENED'
                          : 'SECURITY ALERT: OBSTACLE IN SWING RADIUS',
                        message: !safetyStatus.seatbelt
                          ? 'Seatbelt is unfastened while machine is active. Fasten safety harness before operating hydraulics.'
                          : 'Proximity radar detected an obstacle or personnel in close proximity (< 3.5m).',
                        recommended_action: !safetyStatus.seatbelt
                          ? 'Fasten safety harness immediately before operating machine.'
                          : 'Halt machine motion immediately and verify 360° clearance.',
                      })
                    }
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-200 transition-colors cursor-pointer text-xs"
                    title="Click to view full security alert prompt"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>{!safetyStatus.seatbelt ? 'Seatbelt OFF' : 'Proximity Warning'} (View Alert)</span>
                  </button>
                ) : (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Seatbelt ON · 360° Clear
                  </span>
                )}
              </div>
            </div>

            {/* Operator AI Tip */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 text-xs">
              <span className="font-black uppercase tracking-wider text-amber-700 dark:text-cat-yellow block mb-1">
                Operator Tip
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Engine RPM and hydraulic duty are in the optimal fuel-saving range. Maintain steady bucket fill cycles for maximum tons/liter.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. OPTIONAL ENGINEERING DIAGNOSTICS (COLLAPSIBLE FOR TECHNICIANS ONLY) */}
      <div className="pt-2">
        <button
          onClick={() => setShowDiagnostics((prev) => !prev)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer py-1"
        >
          {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{showDiagnostics ? 'Hide' : 'Show'} Deep Engineering Diagnostics (Technician View)</span>
        </button>

        {showDiagnostics && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-cat-border space-y-4 animate-in fade-in duration-200">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Live CAN-bus Multi-Channel Telemetry Stream
            </h3>
            <LiveTelemetryChart
              defaultMetrics={['hydraulic_temp', 'oil_pressure', 'engine_load', 'rpm']}
              height={260}
            />
          </div>
        )}
      </div>
    </div>
  );
};
