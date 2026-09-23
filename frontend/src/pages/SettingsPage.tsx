import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sparkles,
  Play,
  Square,
  Server,
  Sun,
  Moon,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  fetchSimulatorScenarios,
  startSimulator,
  stopSimulator,
  fetchSimulatorStatus,
} from '../api/simulator';
import { SimulatorScenario } from '../types/telematics';

export const SettingsPage: React.FC = () => {
  const {
    activeMachineId,
    setActiveMachineId,
    connectionStatus,
    activeScenario,
    setActiveScenario,
  } = useRealtime();

  const { theme, setTheme } = useTheme();

  const [scenarios, setScenarios] = useState<SimulatorScenario[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(2.0);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const loadStatus = async () => {
    try {
      const data = await fetchSimulatorScenarios();
      setScenarios(data.scenarios);
      setIsRunning(data.is_running);
    } catch (e) {
      console.warn('Simulator scenarios load error:', e);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(async () => {
      try {
        const st = await fetchSimulatorStatus();
        setIsRunning(st.is_running);
      } catch (e) {
        // quiet
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (scId: string, machine: string) => {
    setLoadingAction(true);
    try {
      setActiveScenario(scId);
      setActiveMachineId(machine);
      await startSimulator(scId, machine, speed);
      setIsRunning(true);
      setStatusMsg(`Simulator started on scenario '${scId}' (${machine}) at ${speed}x speed.`);
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg('Failed to trigger simulator via backend API.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStop = async () => {
    setLoadingAction(true);
    try {
      await stopSimulator();
      setIsRunning(false);
      setStatusMsg('Simulator stopped.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg('Failed to stop simulator.');
    } finally {
      setLoadingAction(false);
    }
  };

  const machines = [
    { id: 'EXC007', model: '320 GC Excavator (Degrading Demo)', type: 'Hydraulic Excavator' },
    { id: 'EXC001', model: '336 Large Excavator (Healthy Benchmark)', type: 'Hydraulic Excavator' },
    { id: 'EXC004', model: '320 GC Excavator (Idle Study)', type: 'Hydraulic Excavator' },
    { id: 'LOD001', model: '950M Medium Wheel Loader (High Output)', type: 'Wheel Loader' },
    { id: 'DOZ001', model: 'D6 Track-Type Tractor', type: 'Track Bulldozer' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-cat-yellow block mb-1">
            Cockpit Configuration & Telematics Simulator
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">System Settings & Controls</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure visual mode, target machinery, deterministic demo scenarios, and inspect network health.
          </p>
        </div>

        <Badge variant={isRunning ? 'success' : 'neutral'} size="lg" dot>
          {isRunning ? 'SIMULATION ACTIVE' : 'SIMULATION STANDBY'}
        </Badge>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-cat-yellow/20 border border-amber-300 dark:border-cat-yellow text-xs font-bold text-amber-900 dark:text-cat-yellow shadow-sm">
          {statusMsg}
        </div>
      )}

      {/* Theme & Display Mode Preference */}
      <Card
        title="Display & Cab Environment Mode"
        subtitle="Default is Day/Light mode for outdoor sunlight visibility; switch to Night mode for low glare"
        icon={theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-sky-400" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between shadow-sm ${
              theme === 'light'
                ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/40 text-slate-900'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Day / Light Mode</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">High contrast for daytime cab glare (Default)</p>
              </div>
            </div>
            {theme === 'light' && <Badge variant="cat" size="sm">ACTIVE</Badge>}
          </div>

          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between shadow-sm ${
              theme === 'dark'
                ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/40 text-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Night / Dark Mode</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Low-intensity dark cockpit for night shifts</p>
              </div>
            </div>
            {theme === 'dark' && <Badge variant="cat" size="sm">ACTIVE</Badge>}
          </div>
        </div>
      </Card>

      {/* Demo Scenario Controller */}
      <Card
        title="Live Demonstration Scenario Launcher"
        subtitle="One-click deterministic hackathon demonstration flows"
        icon={<Sparkles className="w-4 h-4 text-amber-500 dark:text-cat-yellow" />}
        badge={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Speed:</span>
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 text-xs">
              {[1.0, 2.0, 5.0, 10.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    speed === s ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            {isRunning && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleStop}
                loading={loadingAction}
                icon={<Square className="w-3.5 h-3.5 fill-current mr-1" />}
              >
                Halt Simulator
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              id: 'healthy',
              name: 'Healthy Machine Nominal Benchmark (The Happy Path)',
              badge: 'HAPPY PATH',
              badgeVariant: 'success' as const,
              description:
                'Optimal working RPM (1,650), stable hydraulic temp (68.5°C), oil pressure (3.9 bar), coolant (82°C), buckled seatbelt, zero safety infractions, low failure risk (<5%).',
            },
            {
              id: 'degrading',
              name: 'Degrading Machine Thermal Drift',
              badge: 'FLAGSHIP DEMO',
              badgeVariant: 'warning' as const,
              description:
                'Hydraulic temp drifts from 71°C to 93.5°C (TOO WARM), oil pressure drops from 3.8 to 2.3 bar, Random Forest ML failure risk climbs to 88% (HIGH), generating automated maintenance work orders.',
            },
            {
              id: 'unsafe',
              name: 'Unsafe In-Cab Operation & Proximity Hazard',
              badge: 'SAFETY GUARDIAN',
              badgeVariant: 'danger' as const,
              description:
                'Seatbelt unbuckles while operating, 360° obstacle radar proximity alert (< 3.2m), high travel speed (9.2 km/h). Triggers in-cab high-urgency Red Security Alert prompt box with audible siren.',
            },
            {
              id: 'productivity',
              name: 'High Productivity Heavy Digging',
              badge: 'HIGH OUTPUT',
              badgeVariant: 'cat' as const,
              description:
                'Heavy breakout excavation: 84% engine load, 1,950 RPM, 280 bar hydraulic pressure, fast 21.5s dig cycles, accumulating payload tonnage in real time.',
            },
            {
              id: 'excessive_idle',
              name: 'Excessive Machine Idling',
              badge: 'ECO AUDIT',
              badgeVariant: 'neutral' as const,
              description:
                'Demonstrates persistent low idle (715 RPM, 11.5% load, 0 km/h). Intelligence engine calculates wasted fuel cost ($4.50/hr) and delivers operator auto-shutdown coaching.',
            },
          ].map((sc) => {
            const isCurrent = activeScenario === sc.id && isRunning;
            return (
              <div
                key={sc.id}
                className={`industrial-card rounded-xl p-4 flex flex-col justify-between border transition-all duration-200 shadow-sm ${
                  isCurrent ? 'border-amber-400 bg-amber-50/50 dark:border-cat-yellow dark:shadow-glow-amber dark:bg-slate-900/90' : 'hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={sc.badgeVariant} size="sm">
                      {sc.badge}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-cat-yellow">
                      {activeMachineId}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{sc.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{sc.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Target: {activeMachineId} @ {speed}x
                  </span>
                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={loadingAction}
                    onClick={() => handleStart(sc.id, activeMachineId)}
                    icon={<Play className="w-3.5 h-3.5 fill-current mr-1" />}
                  >
                    {isCurrent ? 'Re-Trigger' : `Launch on ${activeMachineId}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Active Machine Cockpit Switcher */}
      <Card
        title="Active Operator Cockpit Machine Selection"
        subtitle="Switch telematics subscription and HUD context"
        icon={<Cpu className="w-4 h-4 text-sky-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {machines.map((m) => {
            const isSelected = activeMachineId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setActiveMachineId(m.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 shadow-sm ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50 dark:border-cat-yellow dark:bg-cat-yellow/10 dark:shadow-glow-amber'
                    : 'border-slate-200 dark:border-cat-border bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{m.id}</span>
                  {isSelected && <Badge variant="cat" size="sm">COCKPIT ACTIVE</Badge>}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{m.model}</p>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 block">{m.type}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Network & Infrastructure Health */}
      <Card
        title="Network & Telematics Data Hub Connectivity"
        subtitle="Environment endpoints and protocol diagnostics"
        icon={<Server className="w-4 h-4 text-emerald-500" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] block font-bold">REST API Hub</span>
            <div className="flex justify-between">
              <span className="text-slate-800 dark:text-slate-200">http://localhost:8000</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">HEALTHY (200 OK)</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] block font-bold">WebSocket Streaming</span>
            <div className="flex justify-between">
              <span className="text-slate-800 dark:text-slate-200">ws://localhost:8000/ws/machines/{activeMachineId}</span>
              <span className={`font-bold ${connectionStatus === 'CONNECTED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
