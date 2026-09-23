import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { ConnectionStatus } from '../context/RealtimeContext';
import { telemetryBuffer } from './telemetryBuffer';

interface OfflineBannerProps {
  connectionStatus: ConnectionStatus;
  isSimulatedOffline?: boolean;
  onOpenNetworkSimulator?: () => void;
  onManualReconnect?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  connectionStatus,
  isSimulatedOffline = false,
  onOpenNetworkSimulator,
  onManualReconnect,
}) => {
  const isOffline = connectionStatus === 'DISCONNECTED' || isSimulatedOffline;
  const [debouncedOffline, setDebouncedOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<string>('');

  useEffect(() => {
    let timer: any;
    if (isOffline) {
      // Debounce offline banner by 1.2s so brief reconnects don't cause flicker
      timer = setTimeout(
        () => {
          setDebouncedOffline(true);
          setLastOnlineTime(telemetryBuffer.getLastFormattedTime());
          setShowRestored(false);
        },
        isSimulatedOffline ? 0 : 1200
      );
    } else {
      clearTimeout(timer);
      if (debouncedOffline) {
        setDebouncedOffline(false);
        setShowRestored(true);
        const restoreTimer = setTimeout(() => {
          setShowRestored(false);
        }, 4000);
        return () => clearTimeout(restoreTimer);
      }
    }
    return () => clearTimeout(timer);
  }, [isOffline, debouncedOffline, isSimulatedOffline]);

  if (!debouncedOffline && !showRestored) {
    return null;
  }

  if (showRestored) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
          <Wifi className="w-4 h-4 text-emerald-200 animate-pulse" />
          <span>✓ CONNECTION RESTORED — Telematics synchronized with central telemetry bus.</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-2 text-xs font-bold shadow-lg border-b border-amber-500 animate-in slide-in-from-top duration-200"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-amber-800/80">
            <WifiOff className="w-4 h-4 text-amber-200" />
          </div>
          <div>
            <span className="uppercase tracking-wider font-black">
              ⚠ OFFLINE MODE {isSimulatedOffline && '(SIMULATED)'}
            </span>
            <span className="mx-2 opacity-60">|</span>
            <span className="font-mono text-amber-100">
              Last Telemetry Cached: {lastOnlineTime || telemetryBuffer.getLastFormattedTime()}
            </span>
            <span className="hidden md:inline ml-2 text-amber-200 font-normal">
              — Standard Operating Procedures (SOPs) viewable; active CAN-bus validation paused.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {onOpenNetworkSimulator && (
            <button
              onClick={onOpenNetworkSimulator}
              className="px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Network Tool</span>
            </button>
          )}

          {onManualReconnect && (
            <button
              onClick={onManualReconnect}
              className="px-3 py-1 rounded bg-white text-amber-900 hover:bg-amber-100 text-[11px] font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default OfflineBanner;
