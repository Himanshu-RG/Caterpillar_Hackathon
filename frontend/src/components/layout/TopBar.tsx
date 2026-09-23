import React, { useState, useEffect } from 'react';
import {
  Bell,
  Bot,
  MapPin,
  Clock,
  Sun,
  Moon,
  FlaskConical,
  Radio,
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { useTheme } from '../../context/ThemeContext';
import { StatusIndicator } from '../common/StatusIndicator';
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
    isSimulating,
    toggleStreamSimulator,
  } = useRealtime();

  const { theme, toggleTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [scenarioSwitching, setScenarioSwitching] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalNotifications = activeSafetyAlerts.length + activeInsights.length;

  const scenarios = [
    { id: 'healthy', label: 'Healthy Nominal (Happy Path)' },
    { id: 'degrading', label: 'Degrading Thermal (Predictive Maint.)' },
    { id: 'unsafe', label: 'Unsafe Operation (Safety Alert)' },
    { id: 'productivity', label: 'High Productivity (Heavy Load)' },
    { id: 'excessive_idle', label: 'Excessive Idle (Eco Tip)' },
  ];

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const sc = scenarios.find((s) => s.id === selectedId);
    if (!sc) return;

    setScenarioSwitching(true);
    setActiveScenario(selectedId);

    try {
      await startSimulator(selectedId, activeMachineId, 2.0);
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
      className={`fixed top-0 right-0 z-20 h-16 bg-white/95 dark:bg-slate-950/95 border-b border-slate-200 dark:border-cat-border backdrop-blur-md px-4 flex items-center justify-between transition-all duration-300 ${
        collapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Site and Machine Identification */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-amber-500 dark:text-cat-yellow" />
          <span className="truncate">{siteId.replace(/_/g, ' ')}</span>
        </div>

        <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-cat-surface-card dark:border-cat-border px-2.5 py-1 text-xs font-mono font-black text-slate-900 dark:text-white">
            {activeMachineId}
          </span>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline truncate">
            {modelName}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <StatusIndicator
          status={connectionStatus}
          label={connectionStatus === 'CONNECTED' ? 'LIVE' : undefined}
          size="sm"
        />
      </div>

      {/* Control Actions & Theme Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Compact Scenario Selector & Stream Mimic Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-cat-border rounded-lg p-1 text-xs">
          <button
            onClick={() => toggleStreamSimulator()}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              isSimulating
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-400 hover:text-slate-950'
            }`}
            title={isSimulating ? 'Stop real-time stream simulation' : 'Start real-time stream simulation'}
          >
            <Radio className={`w-3 h-3 ${isSimulating ? 'animate-pulse' : ''}`} />
            <span className="hidden xl:inline">{isSimulating ? 'Streaming' : 'Stream'}</span>
          </button>

          <FlaskConical className="w-3.5 h-3.5 text-amber-500 dark:text-cat-yellow flex-shrink-0" />
          <select
            value={activeScenario}
            onChange={handleScenarioChange}
            disabled={scenarioSwitching}
            aria-label="Simulation Scenario"
            className="bg-transparent text-xs font-bold text-slate-700 dark:text-cat-yellow focus:outline-none cursor-pointer pr-1"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-200">
                {sc.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live System Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>{currentTime}</span>
        </div>

        {/* Daylight / Night Mode Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'Night (Dark)' : 'Day (Light)'} mode`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-sm cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Night (Dark)' : 'Day (Light)'} mode`}
        >
          {theme === 'light' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
              <span className="hidden sm:inline">Day Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Night Mode</span>
            </>
          )}
        </button>

        {/* AI Assistant Quick Pill */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
          title="Open CAT Intelligent Companion"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">AI Companion</span>
        </button>

        {/* Notifications Icon Button */}
        <button
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-cat-border transition-colors cursor-pointer"
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
