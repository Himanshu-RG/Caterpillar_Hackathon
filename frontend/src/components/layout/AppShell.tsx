import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CriticalAlertModal } from './CriticalAlertModal';
import { NotificationDrawer } from './NotificationDrawer';
import { AssistantDrawer } from '../ai/AssistantDrawer';
import { useRealtime } from '../../context/RealtimeContext';

export const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { safetyStatus, activeSafetyAlerts, activeMachineId } = useRealtime();

  // Evaluate persistent safety indicator status
  const isCritical = safetyStatus.proximity || !safetyStatus.seatbelt;
  const isWarning = safetyStatus.overspeed || safetyStatus.violationsCount > 0;

  const safetyLevel = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL';

  return (
    <div className="min-h-screen bg-cat-black text-slate-100 flex flex-col font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Fixed Top Bar */}
      <TopBar
        collapsed={collapsed}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenAssistant={() => setAssistantOpen(true)}
      />

      {/* Main App Content Area */}
      <div
        className={`flex-1 flex flex-col pt-16 transition-all duration-300 ${
          collapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        {/* Persistent Safety Status Guardian Strip */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-bold transition-colors border-b ${
            safetyLevel === 'CRITICAL'
              ? 'bg-rose-950 text-rose-200 border-rose-700 shadow-glow-red'
              : safetyLevel === 'WARNING'
              ? 'bg-amber-950/80 text-amber-200 border-amber-700 shadow-glow-amber'
              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {safetyLevel === 'CRITICAL' ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            ) : safetyLevel === 'WARNING' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}

            <span className="uppercase tracking-wider">
              {safetyLevel === 'CRITICAL'
                ? '🔴 IMMEDIATE ACTION REQUIRED'
                : safetyLevel === 'WARNING'
                ? '🟠 ATTENTION REQUIRED'
                : '🟢 SAFETY NORMAL — ALL SYSTEMS CLEAR'}
            </span>

            <span className="text-[11px] font-normal opacity-80 hidden md:inline ml-2">
              {safetyLevel === 'CRITICAL'
                ? 'Obstacle or seatbelt breach detected in immediate perimeter'
                : safetyLevel === 'WARNING'
                ? 'Advisory safety limits exceeded'
                : 'Seatbelt secured · 360° radar clear · Ground speed nominal'}
            </span>
          </div>

          <Link
            to="/safety"
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider hover:underline"
          >
            <span>Safety Guardian</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Dynamic Route Pages */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <CriticalAlertModal />
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  );
};
