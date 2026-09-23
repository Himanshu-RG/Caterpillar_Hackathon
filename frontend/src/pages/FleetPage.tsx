import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Cpu,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { fetchFleetSummary } from '../api/fleet';
import { fetchMachines } from '../api/machines';
import { FleetSummary, Machine } from '../types/telematics';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';

export const FleetPage: React.FC = () => {
  const { setActiveMachineId } = useRealtime();
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [sum, mList] = await Promise.all([fetchFleetSummary(), fetchMachines()]);
        setFleetSummary(sum);
        setMachines(mList);
      } catch (err) {
        console.warn('Fleet load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectMachine = (id: string) => {
    setActiveMachineId(id);
    navigate(`/machine/${id}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Site Manager & Fleet Telematics Hub
          </span>
          <h1 className="text-2xl font-black text-white">Fleet Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-asset health, operating utilization, and active hazard overview.
          </p>
        </div>

        <Badge variant="info" size="lg" dot>
          QUARRY NORTH · ACTIVE DISPATCH
        </Badge>
      </div>

      {/* Fleet KPI Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Fleet"
          value={fleetSummary?.total_machines ?? machines.length ?? 10}
          unit="units"
          subtitle="Monitored telematics"
          icon={<Layers className="w-4 h-4 text-cyan-400" />}
        />
        <MetricCard
          label="Operational"
          value={fleetSummary?.operating ?? 8}
          unit="units"
          status="normal"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
        />
        <MetricCard
          label="Idle Standby"
          value={fleetSummary?.idle ?? 1}
          unit="units"
          subtitle="Waiting for haul trucks"
          icon={<Clock className="w-4 h-4 text-slate-400" />}
        />
        <MetricCard
          label="Maintenance Due"
          value={fleetSummary?.maintenance ?? 1}
          unit="units"
          status={fleetSummary?.maintenance && fleetSummary.maintenance > 0 ? 'warning' : 'telemetry'}
          icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
        />
        <MetricCard
          label="Fleet Utilization"
          value={((fleetSummary?.fleet_utilization ?? 0.8) * 100).toFixed(0)}
          unit="%"
          status="normal"
          icon={<TrendingUp className="w-4 h-4 text-cat-yellow" />}
        />
        <MetricCard
          label="Safety Alerts"
          value={fleetSummary?.active_safety_alerts ?? 1}
          unit="alerts"
          status={fleetSummary?.active_safety_alerts && fleetSummary.active_safety_alerts > 0 ? 'critical' : 'normal'}
          icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
        />
      </div>

      {/* Fleet Equipment Table */}
      <Card
        title="Active Fleet Telematics Catalog"
        subtitle="Click any machine to inspect full telemetry gauges and switch operator cockpit"
        icon={<Cpu className="w-4 h-4 text-cat-yellow" />}
      >
        {loading ? (
          <p className="text-xs text-slate-500 py-8 text-center font-mono">
            Loading fleet units from backend telematics hub...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-cat-border text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-3 px-3">Machine ID</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Equipment Type</th>
                  <th className="py-3 px-3">Serial Number</th>
                  <th className="py-3 px-3">Operating Age</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {machines.map((m) => {
                  const isDegradingUnit = m.machine_id === 'EXC007';
                  const isIdleUnit = m.machine_id === 'EXC004';

                  return (
                    <tr
                      key={m.machine_id}
                      onClick={() => handleSelectMachine(m.machine_id)}
                      className="hover:bg-slate-900/80 cursor-pointer group transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-white group-hover:text-cat-yellow">
                        {m.machine_id}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-sans font-semibold">
                        {m.machine_model}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-sans">
                        {m.machine_type}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{m.serial_number}</td>
                      <td className="py-3 px-3 text-slate-400">{m.machine_age_years.toFixed(1)} yrs</td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={isDegradingUnit ? 'warning' : isIdleUnit ? 'warning' : 'success'}
                          size="sm"
                          dot
                        >
                          {isDegradingUnit
                            ? 'ATTENTION (THERMAL)'
                            : isIdleUnit
                            ? 'EXCESSIVE IDLE'
                            : 'OPERATIONAL'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-cat-yellow font-bold text-xs group-hover:translate-x-1 transition-transform">
                          Cockpit <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
