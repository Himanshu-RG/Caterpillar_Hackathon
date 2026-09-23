import React from 'react';
import {
  Gauge,
  User,
  Cpu,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  Fuel,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';

export const BehaviorPage: React.FC = () => {
  const { activeMachineId, dashboard, latestTelemetry, activeScenario } = useRealtime();

  const isDegrading = activeScenario === 'degrading';
  const isIdleScenario = activeScenario === 'excessive_idle';

  const machineDeviations = [
    {
      metric: 'Hydraulic Temperature Drift',
      current: latestTelemetry?.hydraulic_temp ? `${latestTelemetry.hydraulic_temp.toFixed(1)}°C` : '71.0°C',
      baseline: '63.0°C nominal',
      deviation: isDegrading ? '+12.7%' : '+2.1%',
      trend: isDegrading ? 'up' : 'stable',
      status: isDegrading ? 'UNUSUAL' : 'NORMAL',
    },
    {
      metric: 'Fuel Consumption Burn Rate',
      current: latestTelemetry?.fuel_rate ? `${latestTelemetry.fuel_rate.toFixed(1)} L/h` : '8.4 L/h',
      baseline: '8.0 L/h nominal',
      deviation: '+5.0%',
      trend: 'up',
      status: 'ATTENTION',
    },
    {
      metric: 'Earthmoving Cycle Pacing',
      current: '45.2 sec',
      baseline: '42.0 sec baseline',
      deviation: '+7.6%',
      trend: 'up',
      status: 'ATTENTION',
    },
    {
      metric: 'Equipment Idle Time Ratio',
      current: isIdleScenario ? '52.4%' : '18.1%',
      baseline: '14.0% fleet baseline',
      deviation: isIdleScenario ? '+274% (Chronic)' : '+29.2%',
      trend: isIdleScenario ? 'up' : 'stable',
      status: isIdleScenario ? 'UNUSUAL' : 'NORMAL',
    },
  ];

  const operatorMetrics = [
    {
      label: 'Average Machine Idle %',
      baseline: '14.0%',
      current: isIdleScenario ? '52.4%' : '18.1%',
      delta: isIdleScenario ? '+38.4% above benchmark' : '+4.1% above benchmark',
      status: isIdleScenario ? 'UNUSUAL' : 'ATTENTION',
    },
    {
      label: 'Recorded Safety Violations',
      baseline: '0.2 / shift',
      current: '2 today',
      delta: '+1.8 deviation',
      status: 'ATTENTION',
    },
    {
      label: 'Mean Bucket Cycle Duration',
      baseline: '42.0 sec',
      current: '45.0 sec',
      delta: '+3.0 sec pacing gap',
      status: 'ATTENTION',
    },
    {
      label: 'Seatbelt Buckle Compliance',
      baseline: '99.5%',
      current: '98.2%',
      delta: '-1.3% slight breach',
      status: 'NORMAL',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Telemetry Deviation Analytics
          </span>
          <h1 className="text-2xl font-black text-white">Unusual Behavior Detection</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Objective baseline benchmark comparison for machine mechanical circuits and operator pacing.
          </p>
        </div>

        <Badge variant={isIdleScenario || isDegrading ? 'warning' : 'success'} size="lg" dot>
          {isIdleScenario || isDegrading ? 'DEVIATIONS OBSERVED' : 'NOMINAL EQUILIBRIUM'}
        </Badge>
      </div>

      {/* Machine Behavior Section */}
      <Card
        title="Machine Physical Telematics Deviations"
        subtitle="Current operating parameters vs. 30-day historical equipment baseline"
        icon={<Cpu className="w-4 h-4 text-cat-yellow" />}
      >
        <div className="space-y-3">
          {machineDeviations.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-bold text-white block">{item.metric}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Current: {item.current} · Baseline: {item.baseline}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {item.deviation}
                </span>
                <Badge
                  variant={
                    item.status === 'UNUSUAL'
                      ? 'danger'
                      : item.status === 'ATTENTION'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Operator Behavior Section */}
      <Card
        title="Operator Work Cycle & Productivity Deviations"
        subtitle="Operator Alex Johnson (OP001) shift metrics vs. 90-day certified operator baseline"
        icon={<User className="w-4 h-4 text-cyan-400" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operatorMetrics.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between text-xs space-y-2"
            >
              <div className="flex items-start justify-between">
                <span className="font-bold text-slate-200">{item.label}</span>
                <Badge
                  variant={
                    item.status === 'UNUSUAL'
                      ? 'danger'
                      : item.status === 'ATTENTION'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {item.status}
                </Badge>
              </div>

              <div className="flex items-baseline justify-between font-mono pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Current Shift
                  </span>
                  <span className="text-base font-extrabold text-white">{item.current}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Certified Baseline
                  </span>
                  <span className="text-sm font-semibold text-slate-400">{item.baseline}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-amber-400">
                {item.delta}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
