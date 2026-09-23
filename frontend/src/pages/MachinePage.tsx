import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Cpu,
  Activity,
  ShieldCheck,
  HeartPulse,
  Wrench,
  Layers,
  Fuel,
  Gauge,
  Thermometer,
  Zap,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { LiveTelemetryChart } from '../components/charts/LiveTelemetryChart';
import { RiskGauge } from '../components/charts/RiskGauge';
import { fetchMachineById } from '../api/machines';
import { fetchMachineSafetyEvents } from '../api/safety';
import { Machine, SafetyAlert } from '../types/telematics';

export const MachinePage: React.FC = () => {
  const { machineId } = useParams<{ machineId?: string }>();
  const {
    activeMachineId,
    setActiveMachineId,
    dashboard,
    latestTelemetry,
    derivedHealth,
    failureRisk,
    safetyStatus,
  } = useRealtime();

  const targetId = machineId || activeMachineId;
  const [machineData, setMachineData] = useState<Machine | null>(null);
  const [safetyHistory, setSafetyHistory] = useState<SafetyAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'safety' | 'health' | 'maintenance'>('overview');

  useEffect(() => {
    if (machineId && machineId !== activeMachineId) {
      setActiveMachineId(machineId);
    }
  }, [machineId, activeMachineId, setActiveMachineId]);

  useEffect(() => {
    const load = async () => {
      try {
        const m = await fetchMachineById(targetId);
        setMachineData(m);
        const sEvents = await fetchMachineSafetyEvents(targetId, 10);
        setSafetyHistory(sEvents);
      } catch (err) {
        console.warn('Machine fetch error:', err);
      }
    };
    load();
  }, [targetId]);

  const machine = machineData || dashboard?.machine;
  const curState = dashboard?.current_state;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Machine Header */}
      <div className="industrial-card rounded-xl p-5 border-slate-200 dark:border-cat-border/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-cat-yellow/20 border border-amber-300 dark:border-cat-yellow/40 flex items-center justify-center text-amber-600 dark:text-cat-yellow flex-shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">{targetId}</h1>
                <Badge variant="success" size="sm" dot>
                  {curState?.machine_status || 'OPERATIONAL'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {machine?.machine_model} · {machine?.machine_type || 'Hydraulic Excavator'} · Serial: {machine?.serial_number || 'CAT-320-X88'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Site</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{machine?.site_id || 'SITE_QUARRY_NORTH'}</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Age</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{machine?.machine_age_years?.toFixed(1) || '3.2'} yrs</span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Runtime</span>
              <span className="text-amber-600 dark:text-cat-yellow font-bold">{curState?.engine_hours?.toFixed(0) || '1,284'} hrs</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-cat-border/60 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
            { id: 'safety', label: 'Safety Guardian', icon: ShieldCheck },
            { id: 'health', label: 'Machine Health', icon: HeartPulse },
            { id: 'maintenance', label: 'Maintenance Log', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow font-black'
                    : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Engine RPM"
              value={latestTelemetry?.rpm ?? curState?.engine_rpm ?? 1840}
              unit="RPM"
              icon={<Zap className="w-4 h-4 text-purple-500" />}
            />
            <MetricCard
              label="Hydraulic Pressure"
              value={latestTelemetry?.hydraulic_pressure ?? curState?.hydraulic_pressure_bar ?? 241}
              unit="bar"
              icon={<Gauge className="w-4 h-4 text-emerald-500" />}
            />
            <MetricCard
              label="Hydraulic Temp"
              value={latestTelemetry?.hydraulic_temp ?? curState?.hydraulic_temp_c ?? 71}
              unit="°C"
              decimals={1}
              status={latestTelemetry?.hydraulic_temp && latestTelemetry.hydraulic_temp > 82 ? 'warning' : 'telemetry'}
              icon={<Thermometer className="w-4 h-4 text-amber-500" />}
            />
            <MetricCard
              label="Fuel Burn Rate"
              value={latestTelemetry?.fuel_rate ?? curState?.fuel_rate_l_hr ?? 8.4}
              unit="L/h"
              decimals={1}
              icon={<Fuel className="w-4 h-4 text-amber-500" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title="Equipment Specifications"
              subtitle="Factory build & telematics config"
              icon={<Cpu className="w-4 h-4 text-amber-500" />}
            >
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Machine Model</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{machine?.machine_model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Serial Identification</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{machine?.serial_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Operating Site</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{machine?.site_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Commissioning Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{machine?.commission_date}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 dark:text-slate-400">Telematics Protocol</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">CAN J1939 + WebSocket</span>
                </div>
              </div>
            </Card>

            <RiskGauge
              probability={failureRisk?.probability ?? 0.23}
              riskLevel={failureRisk?.riskLevel ?? 'LOW'}
              horizon={failureRisk?.horizon ?? '50 operating hours'}
              signals={failureRisk?.signals ?? ['Hydraulic temp drift', 'Oil pressure nominal']}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Live Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <Card
            title="Multi-Channel Telemetry Stream"
            subtitle="Real-time synchronized sensor recording"
            icon={<Activity className="w-4 h-4 text-sky-500" />}
          >
            <LiveTelemetryChart
              defaultMetrics={['hydraulic_temp', 'oil_pressure', 'hydraulic_pressure', 'engine_load']}
              height={360}
            />
          </Card>
        </div>
      )}

      {/* Tab 3: Safety */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="industrial-card rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                Seatbelt Sensor
              </span>
              <span className={`text-lg font-black ${safetyStatus.seatbelt ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {safetyStatus.seatbelt ? '✓ SECURED' : '⚠ UNBUCKLED'}
              </span>
            </div>
            <div className="industrial-card rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                Proximity Radar
              </span>
              <span className={`text-lg font-black ${safetyStatus.proximity ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {safetyStatus.proximity ? '⚠ HAZARD DETECTED' : '✓ CLEAR'}
              </span>
            </div>
            <div className="industrial-card rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                30-Min Risk Prediction
              </span>
              <span className="text-lg font-mono font-black text-amber-600 dark:text-cat-yellow">
                {(safetyStatus.unsafeProbability30m * 100).toFixed(0)}% Risk
              </span>
            </div>
          </div>

          <Card
            title="Historical Machine Safety Events"
            subtitle="Recorded sensor violations and proximity triggers"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
          >
            {safetyHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No safety alerts logged for this machine.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-cat-border text-slate-500 dark:text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Event ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {safetyHistory.map((ev) => (
                      <tr key={ev.event_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{ev.event_id}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{ev.event_start}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{ev.event_type}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={ev.event_severity === 'CRITICAL' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {ev.event_severity}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{ev.duration_min} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 4: Health */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskGauge
            probability={failureRisk?.probability ?? 0.23}
            riskLevel={failureRisk?.riskLevel ?? 'LOW'}
            horizon={failureRisk?.horizon ?? '50 operating hours'}
            signals={failureRisk?.signals ?? ['Hydraulic temp drift', 'Oil pressure nominal']}
          />

          <Card
            title="Thermodynamic Health Signals"
            subtitle="Sensor drift from nominal equipment baseline"
            icon={<HeartPulse className="w-4 h-4 text-amber-500" />}
          >
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Hydraulic Circuit Temp:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                  {latestTelemetry?.hydraulic_temp?.toFixed(1) || '71.0'}°C (Elevated)
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Lubrication Gallery Pressure:</span>
                <span className="font-mono text-sky-600 dark:text-cyan-400 font-bold">
                  {latestTelemetry?.oil_pressure?.toFixed(2) || '3.80'} bar (Nominal)
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">Engine Coolant Circuit:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {latestTelemetry?.coolant_temp?.toFixed(1) || '82.0'}°C (Nominal)
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-cat-border bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Predictive Insight
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                  Gradual thermal drift observed during repetitive heavy bucket cycles. Inspection recommended within next scheduled 50-hour service window.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 5: Maintenance */}
      {activeTab === 'maintenance' && (
        <Card
          title="Maintenance Work Orders & Inspections"
          subtitle="Scheduled & preventative servicing history"
          icon={<Wrench className="w-4 h-4 text-amber-500" />}
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-cat-border bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Scheduled 1,000h Preventative Maintenance
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Engine oil, hydraulic filters, coolant flush completed at 1,002 hours.
                </span>
              </div>
              <Badge variant="success" size="sm">COMPLETED</Badge>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-cat-border bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Upcoming 1,500h Hydraulic Circuit Inspection
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Target: 1,500 hours (in approx 216 operating hours).
                </span>
              </div>
              <Badge variant="neutral" size="sm">SCHEDULED</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
