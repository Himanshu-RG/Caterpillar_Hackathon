import React, { useState } from 'react';
import { X, ShieldAlert, Activity, CheckCircle, Info, ChevronRight, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '../../context/RealtimeContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { activeSafetyAlerts, activeInsights, failureRisk } = useRealtime();
  const [filter, setFilter] = useState<'ALL' | 'SAFETY' | 'HEALTH' | 'INSIGHTS'>('ALL');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const notifications = [
    ...activeSafetyAlerts.map((s) => ({
      id: s.event_id,
      category: 'SAFETY',
      severity: s.event_severity,
      title: s.event_type.replace(/_/g, ' '),
      message: `Safety event recorded on machine ${s.machine_id} for duration ${s.duration_min} min.`,
      time: s.event_start.slice(11, 19),
      path: '/safety',
    })),
    ...activeInsights.map((ins) => ({
      id: ins.insight_id,
      category: ins.type === 'PREDICTIVE_MAINTENANCE' ? 'HEALTH' : 'INSIGHTS',
      severity: ins.severity,
      title: ins.title,
      message: ins.message || ins.recommended_action,
      time: ins.timestamp.slice(11, 19),
      path: ins.type === 'PREDICTIVE_MAINTENANCE' ? '/health' : '/dashboard',
    })),
  ];

  const filtered =
    filter === 'ALL'
      ? notifications
      : notifications.filter((n) => n.category === filter);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-cat-border bg-slate-950 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-cat-border flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-cat-yellow" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Notification Center
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300">
                {notifications.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-3 border-b border-cat-border bg-slate-900/40 overflow-x-auto">
            {(['ALL', 'SAFETY', 'HEALTH', 'INSIGHTS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded text-xs font-bold tracking-wider uppercase transition-colors ${
                  filter === cat
                    ? 'bg-cat-yellow text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mb-3 text-emerald-500/40" />
                <p className="text-sm font-semibold text-slate-400">No active notifications</p>
                <p className="text-xs text-slate-500 mt-1">All equipment channels clear</p>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className="industrial-card p-3.5 rounded-lg hover:border-slate-600 cursor-pointer group transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Badge
                      variant={
                        item.severity === 'CRITICAL'
                          ? 'danger'
                          : item.severity === 'HIGH' || (item.severity as string) === 'WARNING'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      {item.severity}
                    </Badge>
                    <span className="font-mono text-[10px] text-slate-500">{item.time}</span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-cat-yellow transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800/80">
                    <span className="uppercase tracking-wider font-semibold">{item.category}</span>
                    <span className="flex items-center text-cat-yellow font-medium group-hover:translate-x-0.5 transition-transform">
                      View details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-cat-border bg-slate-900/60 text-center">
            <span className="text-[11px] text-slate-500">
              Live notifications synced via WebSocket
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
