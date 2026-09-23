import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, ShieldAlert, ChevronRight } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CriticalAlertModal } from './CriticalAlertModal';
import { NotificationDrawer } from './NotificationDrawer';
import { AssistantDrawer } from '../ai/AssistantDrawer';
import { GlobalStatusStrip } from './GlobalStatusStrip';

export const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-cat-black text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
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
        {/* Persistent In-Cab Global Status Strip */}
        <GlobalStatusStrip />

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
