import React, { useState, useEffect } from 'react';
import {
  Bell,
  Bot,
  Play,
  Activity,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { StatusIndicator } from '../common/StatusIndicator';
import { Badge } from '../common/Badge';
import { startSimulator } from '../../api/simulator';

interface TopBarProps {
  onOpenNotifications: () => void;
  onOpenAssistant: () => void;
  collapsed: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenNotifications,
  onOpenAssistant,
  collapsed,
}) => {
  const {
    activeMachineId,
    setActiveMachineId,
    connectionStatus,
    dashboard,
    activeSafetyAlerts,
    activeInsights,
    activeScenario,
    setActiveScenario,
  } = useRealtime();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [scenarioSwitching, setScenarioSwitching] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalNotifications = activeSafetyAlerts.length + activeInsights.length;

  const scenarios = [
    { id: 'degrading', label: 'Degrading Thermal (EXC007)', machine: 'EXC007' },
    { id: 'healthy', label: 'Healthy Nominal (EXC001)', machine: 'EXC001' },
    { id: 'excessive_idle', label: 'Excessive Idle (EXC004)', machine: 'EXC004' },
    { id: 'unsafe', label: 'Unsafe Operation (EXC007)', machine: 'EXC007' },
    { id: 'productivity', label: 'High Productivity (LOD001)', machine: 'LOD001' },
  ];

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const sc = scenarios.find((s) => s.id === selectedId);
    if (!sc) return;

    setScenarioSwitching(true);
    setActiveScenario(selectedId);
    if (sc.machine !== activeMachineId) {
      setActiveMachineId(sc.machine);
    }

    try {
      await startSimulator(selectedId, sc.machine, 2.0);
    } catch (err) {
      console.warn('Could not launch simulator via API:', err);
    } finally {
      setScenarioSwitching(false);
    }
  };

  const modelName = dashboard?.machine?.machine_model || '320 GC Excavator';
  const siteId = dashboard?.machine?.site_id || 'SITE_QUARRY_NORTH';

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-slate-950/95 border-b border-cat-border backdrop-blur-md px-4 flex items-center justify-between transition-all duration-300 ${
        collapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Site and Machine Identification */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-cat-yellow" />
          <span className="truncate">{siteId.replace(/_/g, ' ')}</span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="rounded bg-cat-surface-card border border-cat-border px-2 py-0.5 text-xs font-mono font-black text-white">
            {activeMachineId}
          </span>
          <span className="text-xs font-semibold text-slate-300 hidden sm:inline truncate">
            {modelName}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <StatusIndicator
          status={connectionStatus}
          label={connectionStatus === 'CONNECTED' ? 'LIVE' : undefined}
          size="sm"
        />
      </div>

      {/* Simulator Scenario Controller & Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Scenario Switcher Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-cat-border rounded-lg px-2.5 py-1 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-cat-yellow flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase hidden md:inline">
            Scenario:
          </span>
          <select
            value={activeScenario}
            onChange={handleScenarioChange}
            disabled={scenarioSwitching}
            className="bg-transparent text-xs font-bold text-cat-yellow focus:outline-none cursor-pointer pr-1"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-slate-950 text-slate-200">
                {sc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live System Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 px-2 py-1 rounded bg-slate-900/60 border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentTime}</span>
        </div>

        {/* AI Assistant Quick Button */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cat-yellow/20 hover:bg-cat-yellow/30 text-cat-yellow border border-cat-yellow/50 text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          title="Open CAT Intelligent Companion"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">AI Companion</span>
        </button>

        {/* Notifications Icon Button */}
        <button
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="relative p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-cat-border transition-colors"
        >
          <Bell className="w-4 h-4" />
          {totalNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm">
              {totalNotifications}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
