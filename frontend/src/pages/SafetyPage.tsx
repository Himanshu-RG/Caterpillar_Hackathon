import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Radio,
  Gauge,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { fetchRecentSafetyAlerts } from '../api/safety';
import { SafetyAlert } from '../types/telematics';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';

export const SafetyPage: React.FC = () => {
  const { safetyStatus, activeMachineId, latestTelemetry } = useRealtime();
  const [recentEvents, setRecentEvents] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const events = await fetchRecentSafetyAlerts(25);
        setRecentEvents(events);
      } catch (err) {
        console.warn('Safety events fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isCritical = safetyStatus.proximity || !safetyStatus.seatbelt;
  const isWarning = safetyStatus.overspeed || safetyStatus.violationsCount > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Zero-Incident Mandate
          </span>
          <h1 className="text-2xl font-black text-white">Safety Guardian Cockpit</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous in-cab seatbelt compliance, proximity radar hazard detection, and predictive risk scoring.
          </p>
        </div>

        <Badge
          variant={isCritical ? 'danger' : isWarning ? 'warning' : 'success'}
          size="lg"
          dot
        >
          {isCritical ? 'IMMEDIATE ACTION REQUIRED' : isWarning ? 'ATTENTION REQUIRED' : 'SAFETY NORMAL'}
        </Badge>
      </div>

      {/* Safety Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Seatbelt Status"
          value={safetyStatus.seatbelt ? 'FASTENED' : 'UNBUCKLED'}
          status={safetyStatus.seatbelt ? 'normal' : 'critical'}
          icon={<UserCheck className="w-4 h-4 text-emerald-400" />}
          subtitle="98.2% shift compliance"
        />
        <MetricCard
          label="360° Proximity"
          value={safetyStatus.proximity ? 'DETECTED' : 'CLEAR'}
          status={safetyStatus.proximity ? 'critical' : 'normal'}
          icon={<Radio className="w-4 h-4 text-cat-yellow" />}
          subtitle="Perimeter radar sensor"
        />
        <MetricCard
          label="Travel Speed"
          value={latestTelemetry?.speed_kmh?.toFixed(1) || '4.2'}
          unit="km/h"
          status={safetyStatus.overspeed ? 'warning' : 'normal'}
          icon={<Gauge className="w-4 h-4 text-cyan-400" />}
          subtitle="Limit: 12.0 km/h"
        />
        <MetricCard
          label="Unsafe Risk (30m)"
          value={((safetyStatus.unsafeProbability30m || 0.1) * 100).toFixed(0)}
          unit="%"
          status={safetyStatus.unsafeProbability30m > 0.35 ? 'warning' : 'normal'}
          icon={<Activity className="w-4 h-4 text-purple-400" />}
          subtitle="Random Forest Safety ML"
        />
      </div>

      {/* Live In-Cab Safety Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card
            title="Recent Fleet Safety Events"
            subtitle="Consolidated violation log across all monitored telematics intervals"
            icon={<ShieldAlert className="w-4 h-4 text-amber-400" />}
          >
            {loading ? (
              <p className="text-xs text-slate-500 py-6 text-center font-mono">
                Loading safety records from data hub...
              </p>
            ) : recentEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
                <p className="text-xs font-semibold text-slate-400">Zero active safety violations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-cat-border text-slate-400 uppercase font-bold text-[10px]">
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Machine</th>
                      <th className="py-2.5 px-3">Violation Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentEvents.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-slate-900/60">
                        <td className="py-2.5 px-3 text-slate-400">{ev.event_id}</td>
                        <td className="py-2.5 px-3 text-slate-300">{ev.event_start}</td>
                        <td className="py-2.5 px-3 text-white font-bold">{ev.machine_id}</td>
                        <td className="py-2.5 px-3 text-slate-200">{ev.event_type.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              ev.event_severity === 'CRITICAL'
                                ? 'danger'
                                : ev.event_severity === 'HIGH'
                                ? 'warning'
                                : 'info'
                            }
                            size="sm"
                          >
                            {ev.event_severity}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{ev.duration_min} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Safety Protocol Guide */}
        <div className="space-y-4">
          <Card
            title="In-Cab Safety Protocols"
            subtitle="Standard operating procedures (SOP)"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          >
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block mb-1">
                  1. Proximity Alarm Procedure
                </span>
                <p className="text-slate-400">
                  Upon 360° radar hazard detection, bring equipment to complete stop. Sound horn twice and verify clearance before resuming boom rotation.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block mb-1">
                  2. Hydraulic Lockout Lever
                </span>
                <p className="text-slate-400">
                  Always engage red hydraulic lockout pilot lever prior to unbuckling seatbelt or leaving the operator cab.
                </p>
              </div>

              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="font-bold text-white block mb-1">
                  3. Overspeed on Grades
                </span>
                <p className="text-slate-400">
                  Do not exceed 6.0 km/h on quarry ingress/egress ramps when loaded with overburden rock.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
