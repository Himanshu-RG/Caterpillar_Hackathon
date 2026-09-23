import React, { useState, useEffect } from 'react';
import {
  WifiOff,
  Wifi,
  X,
  Play,
  StopCircle,
  Timer,
  HardDriveDownload,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { telemetryBuffer } from './telemetryBuffer';

interface NetworkSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (offline: boolean) => void;
}

export const NetworkSimulatorModal: React.FC<NetworkSimulatorModalProps> = ({
  isOpen,
  onClose,
  isSimulatedOffline,
  setIsSimulatedOffline,
}) => {
  const [activeDuration, setActiveDuration] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    let interval: any;
    if (activeDuration && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsSimulatedOffline(false);
            setActiveDuration(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeDuration, remainingSeconds, setIsSimulatedOffline]);

  if (!isOpen) return null;

  const handleStartTimedDrop = (seconds: number) => {
    setActiveDuration(seconds);
    setRemainingSeconds(seconds);
    setIsSimulatedOffline(true);
  };

  const handleStopDrop = () => {
    setActiveDuration(null);
    setRemainingSeconds(0);
    setIsSimulatedOffline(false);
  };

  const handleToggleIndefinite = () => {
    setActiveDuration(null);
    setRemainingSeconds(0);
    setIsSimulatedOffline(!isSimulatedOffline);
  };

  const bufferedCount = telemetryBuffer.getBufferedCount();
  const lastTime = telemetryBuffer.getLastFormattedTime();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-cat-yellow/10 text-amber-600 dark:text-cat-yellow border border-amber-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Network Drop Simulator
              </h3>
              <p className="text-xs text-slate-500">
                Simulate job-site quarry & tunnel dead-zone disconnects
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Network Status Card */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isSimulatedOffline
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isSimulatedOffline ? (
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-cat-yellow animate-pulse" />
            ) : (
              <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">
                {isSimulatedOffline ? 'SIMULATED OFFLINE' : 'ONLINE & SYNCHRONIZED'}
              </span>
              <span className="text-[11px] font-mono opacity-80">
                {isSimulatedOffline
                  ? remainingSeconds > 0
                    ? `Auto-restoring in ${remainingSeconds}s...`
                    : 'Manual disconnected mode active'
                  : 'Central Telemetry WebSocket Connected'}
              </span>
            </div>
          </div>

          {remainingSeconds > 0 && (
            <div className="font-mono text-xl font-black px-3 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-cat-yellow">
              {remainingSeconds}s
            </div>
          )}
        </div>

        {/* Local In-Cab Rolling Buffer Status */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
              <HardDriveDownload className="w-4 h-4 text-sky-500" />
              In-Cab Rolling Telemetry Buffer
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {bufferedCount} packets (bounded ~15m)
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Last Telemetry Sync Time:</span>
            <span className="font-mono">{lastTime}</span>
          </div>
        </div>

        {/* Drop Simulation Trigger Buttons */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Trigger Timed Disconnect Drop:
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleStartTimedDrop(5)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-cat-yellow hover:bg-amber-50 dark:hover:bg-slate-800 font-black text-xs text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5 text-amber-500" />
              <span>5 Seconds</span>
            </button>

            <button
              onClick={() => handleStartTimedDrop(15)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-cat-yellow hover:bg-amber-50 dark:hover:bg-slate-800 font-black text-xs text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5 text-amber-500" />
              <span>15 Seconds</span>
            </button>

            <button
              onClick={() => handleStartTimedDrop(30)}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-cat-yellow hover:bg-amber-50 dark:hover:bg-slate-800 font-black text-xs text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Timer className="w-3.5 h-3.5 text-amber-500" />
              <span>30 Seconds</span>
            </button>
          </div>
        </div>

        {/* Manual Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant={isSimulatedOffline ? 'primary' : 'secondary'}
            onClick={isSimulatedOffline ? handleStopDrop : handleToggleIndefinite}
            icon={
              isSimulatedOffline ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )
            }
            className="w-full font-bold"
          >
            {isSimulatedOffline ? 'Restore Connection Now' : 'Toggle Persistent Offline Mode'}
          </Button>
        </div>

        {/* Job-Site Resilience Note */}
        <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Edge Fail-Safe:</strong> When offline, in-cab SOPs and checklists remain fully
            readable, and the rolling buffer stores telematics. Live hardware verification automatically pauses until connection re-establishes to prevent false certifications.
          </span>
        </div>
      </div>
    </div>
  );
};
export default NetworkSimulatorModal;
