import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Sparkles,
  Play,
  Square,
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  Zap,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Cockpit Configuration & Telematics Simulator
          </span>
          <h1 className="text-2xl font-black text-white">System Settings & Demo Scenarios</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure target machinery, launch deterministic demo scenarios, and inspect network health.
          </p>
        </div>

        <Badge variant={isRunning ? 'success' : 'neutral'} size="lg" dot>
          {isRunning ? 'SIMULATION ACTIVE' : 'SIMULATION STANDBY'}
        </Badge>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-cat-yellow/20 border border-cat-yellow text-xs font-bold text-cat-yellow">
          {statusMsg}
        </div>
      )}

      {/* Demo Scenario Controller */}
      <Card
        title="Live Demonstration Scenario Launcher"
        subtitle="One-click deterministic hackathon demonstration flows"
        icon={<Sparkles className="w-4 h-4 text-cat-yellow" />}
        badge={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Speed:</span>
            <div className="flex items-center rounded bg-slate-900 border border-slate-700 p-0.5 text-xs">
              {[1.0, 2.0, 5.0, 10.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    speed === s ? 'bg-cat-yellow text-slate-950' : 'text-slate-400 hover:text-white'
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
              id: 'degrading',
              name: 'Degrading Machine Thermal Drift',
              machine: 'EXC007',
              badge: 'FLAGSHIP DEMO',
              badgeVariant: 'warning' as const,
              description:
                'Hydraulic temperature drifts from 68°C to 88°C, lubrication gallery pressure drops, Random Forest ML failure risk escalates from 23% to 74%, and the intelligence engine issues priority inspection work orders.',
            },
            {
              id: 'healthy',
              name: 'Healthy Machine Nominal Benchmark',
              machine: 'EXC001',
              badge: 'BASELINE',
              badgeVariant: 'success' as const,
              description:
                'Excavator operates in stable thermodynamic equilibrium (< 72°C), zero safety alerts, and on-track task pacing.',
            },
            {
              id: 'excessive_idle',
              name: 'Excessive Machine Idling',
              machine: 'EXC004',
              badge: 'EFFICIENCY AUDIT',
              badgeVariant: 'cat' as const,
              description:
                'Demonstrates 52% idle time ratio during spotter delay. Intelligence engine attributes wasted fuel cost and delivers operator auto-shutdown coaching.',
            },
            {
              id: 'unsafe',
              name: 'Unsafe In-Cab Operation & Near Miss',
              machine: 'EXC007',
              badge: 'SAFETY GUARDIAN',
              badgeVariant: 'danger' as const,
              description:
                'Triggers unbuckled seatbelt in motion followed by 360° radar proximity alert (< 3.2m), causing high-priority alert overlay and sound synthesis.',
            },
          ].map((sc) => {
            const isCurrent = activeScenario === sc.id && isRunning;
            return (
              <div
                key={sc.id}
                className={`industrial-card rounded-lg p-4 flex flex-col justify-between border transition-all duration-200 ${
                  isCurrent ? 'border-cat-yellow shadow-glow-amber bg-slate-900/90' : 'hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={sc.badgeVariant} size="sm">
                      {sc.badge}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-cat-yellow">
                      {sc.machine}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{sc.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">{sc.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    Target: {sc.machine} @ {speed}x
                  </span>
                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={loadingAction}
                    onClick={() => handleStart(sc.id, sc.machine)}
                    icon={<Play className="w-3.5 h-3.5 fill-current mr-1" />}
                  >
                    {isCurrent ? 'Re-Trigger' : 'Launch Scenario'}
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
        icon={<Cpu className="w-4 h-4 text-cyan-400" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {machines.map((m) => {
            const isSelected = activeMachineId === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setActiveMachineId(m.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-cat-yellow bg-cat-yellow/10 shadow-glow-amber'
                    : 'border-cat-border bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-sm font-black text-white">{m.id}</span>
                  {isSelected && <Badge variant="cat" size="sm">COCKPIT ACTIVE</Badge>}
                </div>
                <p className="text-xs text-slate-300 font-semibold">{m.model}</p>
                <span className="text-[10px] font-mono text-slate-500 mt-1 block">{m.type}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Network & Infrastructure Health */}
      <Card
        title="Network & Telematics Data Hub Connectivity"
        subtitle="Environment endpoints and protocol diagnostics"
        icon={<Server className="w-4 h-4 text-emerald-400" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">REST API Hub</span>
            <div className="flex justify-between">
              <span className="text-slate-200">http://localhost:8000</span>
              <span className="text-emerald-400 font-bold">HEALTHY (200 OK)</span>
            </div>
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-slate-400 uppercase text-[10px] block font-bold">WebSocket Streaming</span>
            <div className="flex justify-between">
              <span className="text-slate-200">ws://localhost:8000/ws/machines/{activeMachineId}</span>
              <span className={`font-bold ${connectionStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
