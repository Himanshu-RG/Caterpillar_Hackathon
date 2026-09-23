import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Activity,
  CheckCircle2,
  HardHat,
  GraduationCap,
  Wifi,
  WifiOff,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { OfflineBanner } from '../../offline/OfflineBanner';
import { NetworkSimulatorModal } from '../../offline/NetworkSimulatorModal';

export const GlobalStatusStrip: React.FC = () => {
  const {
    activeMachineId,
    connectionStatus,
    safetyStatus,
    derivedHealth,
    currentTask,
    isSimulatedOffline,
    setIsSimulatedOffline,
    reconnectWebSocket,
    isSimulating,
  } = useRealtime();

  const [networkModalOpen, setNetworkModalOpen] = useState(false);

  // Safety evaluation
  const isSafetyCritical = safetyStatus.proximity || !safetyStatus.seatbelt;
  const isSafetyWarning = safetyStatus.overspeed || safetyStatus.violationsCount > 0;
  const safetyText = isSafetyCritical ? '✕ CRITICAL' : isSafetyWarning ? '⚠ ADVISORY' : '✓ NORMAL';

  // Health evaluation
  const healthStatus = derivedHealth?.health_status || 'NORMAL';
  const healthText =
    healthStatus === 'CRITICAL' ? '✕ CRITICAL' : healthStatus === 'ATTENTION' ? '● MONITOR' : '● NOMINAL';

  // Task evaluation
  const taskText = currentTask
    ? `TASK: ${currentTask.task_type?.toUpperCase().replace('_', ' ')}`
    : 'TASK: IDLE';

  return (
    <div className="w-full select-none z-30">
      {/* Offline Alert Banner (shown when connection drops or is simulated) */}
      <OfflineBanner
        connectionStatus={connectionStatus}
        isSimulatedOffline={isSimulatedOffline}
        onOpenNetworkSimulator={() => setNetworkModalOpen(true)}
        onManualReconnect={reconnectWebSocket}
      />

      {/* Persistent Industrial Cab Status Strip */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-1.5 text-xs font-mono flex items-center justify-between overflow-x-auto gap-4 scrollbar-none shadow-sm">
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Machine Identifier */}
          <Link
            to="/machine"
            className="flex items-center gap-1.5 text-white font-bold hover:text-amber-400 dark:hover:text-cat-yellow transition-colors"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400">MACHINE</span>
            <span className="text-amber-400 font-black">{activeMachineId}</span>
          </Link>

          <span className="text-slate-700">·</span>

          {/* Real-time Connection State */}
          <div className="flex items-center gap-1.5">
            {connectionStatus === 'CONNECTED' && !isSimulatedOffline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>● LIVE {isSimulating && '(SIM)'}</span>
              </span>
            ) : connectionStatus === 'CONNECTING' ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>● CONNECTING</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>○ OFFLINE</span>
              </span>
            )}
          </div>

          <span className="text-slate-700">·</span>

          {/* Safety Pillar */}
          <Link
            to="/safety"
            className={`flex items-center gap-1 font-bold transition-colors ${
              isSafetyCritical
                ? 'text-rose-400 hover:text-rose-300 animate-pulse'
                : isSafetyWarning
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <span className="text-slate-400 font-normal">SAFETY</span>
            <span>{safetyText}</span>
          </Link>

          <span className="text-slate-700">·</span>

          {/* Health Pillar */}
          <Link
            to="/health"
            className={`flex items-center gap-1 font-bold transition-colors ${
              healthStatus === 'CRITICAL'
                ? 'text-rose-400 hover:text-rose-300'
                : healthStatus === 'ATTENTION'
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <span className="text-slate-400 font-normal">HEALTH</span>
            <span>{healthText}</span>
          </Link>

          <span className="text-slate-700">·</span>

          {/* Single-Task Operator State */}
          <Link
            to="/tasks"
            className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
          >
            <span className="text-amber-400 font-semibold">{taskText}</span>
          </Link>

          <span className="text-slate-700">·</span>

          {/* Training Readiness Link */}
          <Link
            to="/training"
            className="flex items-center gap-1 text-cat-yellow font-bold hover:underline"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>TRAINING READY</span>
          </Link>
        </div>

        {/* Network & Presentation Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            to="/demo"
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider transition-colors"
          >
            Auto Demo
          </Link>

          <button
            onClick={() => setNetworkModalOpen(true)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Simulate job-site quarry / tunnel network drop"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Network Tool</span>
          </button>
        </div>
      </div>

      {/* Network Simulator Modal */}
      <NetworkSimulatorModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        isSimulatedOffline={isSimulatedOffline}
        setIsSimulatedOffline={setIsSimulatedOffline}
      />
    </div>
  );
};
export default GlobalStatusStrip;
