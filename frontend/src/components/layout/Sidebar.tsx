import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  CheckSquare,
  ShieldCheck,
  HeartPulse,
  Gauge,
  GraduationCap,
  AlertOctagon,
  Layers,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Radio,
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { StatusIndicator } from '../common/StatusIndicator';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { activeMachineId, connectionStatus, safetyStatus } = useRealtime();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Machine', path: `/machine/${activeMachineId}`, icon: Cpu },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    {
      name: 'Safety',
      path: '/safety',
      icon: ShieldCheck,
      badge: safetyStatus.proximity ? 'HAZARD' : undefined,
      badgeColor: 'bg-rose-600 text-white',
    },
    { name: 'Machine Health', path: '/health', icon: HeartPulse },
    { name: 'Behavior', path: '/behavior', icon: Gauge },
    { name: 'Training', path: '/training', icon: GraduationCap },
    { name: 'Incidents', path: '/incidents', icon: AlertOctagon },
  ];

  const secondaryItems = [
    { name: 'Fleet Overview', path: '/fleet', icon: Layers },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen bg-slate-950 border-r border-cat-border flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Logo Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-cat-border bg-slate-950">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Caterpillar Logo Hexagon */}
              <div className="w-8 h-8 rounded bg-cat-yellow flex items-center justify-center font-black text-slate-950 text-sm tracking-tighter shadow-md flex-shrink-0">
                CAT
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-black uppercase tracking-wider text-white truncate">
                  Operator Companion
                </h1>
                <p className="text-[10px] text-cat-yellow font-bold uppercase tracking-widest truncate">
                  Intelligent Telematics
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-8 h-8 rounded bg-cat-yellow flex items-center justify-center font-black text-slate-950 text-xs shadow-md">
              CAT
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Live Status indicator strip */}
        <div className={`px-4 py-2 border-b border-cat-border/60 bg-slate-900/50 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <StatusIndicator
            status={connectionStatus}
            label={collapsed ? undefined : connectionStatus === 'CONNECTED' ? 'Live Telemetry' : 'Reconnecting'}
            size="sm"
          />
          {!collapsed && (
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {activeMachineId}
            </span>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {!collapsed && 'Operator Cockpit'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-cat-yellow text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
                {!collapsed && item.badge && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="px-2 pt-4 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-t border-cat-border/40 mt-3">
            {!collapsed && 'Management & Settings'}
          </div>

          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-cat-yellow text-slate-950 font-bold shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Operator Status Footer */}
      <div className="p-3 border-t border-cat-border bg-slate-900/70">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cat-yellow flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Active Operator
              </span>
              <p className="text-xs font-bold text-white truncate">Alex Johnson</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                <span>OP001</span>
                <span className="text-cat-yellow font-semibold">{activeMachineId}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Alex Johnson (OP001)">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cat-yellow">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
