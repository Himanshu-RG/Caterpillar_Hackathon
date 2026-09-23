import React, { useState } from 'react';
import {
  HeartPulse,
  Thermometer,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RiskGauge } from '../components/charts/RiskGauge';
import { LiveTelemetryChart } from '../components/charts/LiveTelemetryChart';

export const HealthPage: React.FC = () => {
  const {
    activeMachineId,
    dashboard,
    latestTelemetry,
    derivedHealth,
    failureRisk,
  } = useRealtime();

  const [serviceRequested, setServiceRequested] = useState(false);

  const hydTemp = latestTelemetry?.hydraulic_temp ?? dashboard?.current_state?.hydraulic_temp_c ?? 71;
  const oilPress = latestTelemetry?.oil_pressure ?? dashboard?.current_state?.oil_pressure_bar ?? 3.8;
  const coolantTemp = latestTelemetry?.coolant_temp ?? dashboard?.current_state?.coolant_temp_c ?? 82;
  const loadPct = latestTelemetry?.load_pct ?? dashboard?.current_state?.engine_load_pct ?? 61;

  const isDegrading = (failureRisk?.probability ?? 0) > 0.35 || hydTemp > 80;

  const healthSignals = [
    {
      name: 'Hydraulic Circuit Temperature',
      value: `${hydTemp.toFixed(1)}°C`,
      trend: isDegrading ? 'up' : 'stable',
      trendLabel: isDegrading ? '↑ Thermal drift (+8°C above baseline)' : 'Nominal equilibrium',
      status: hydTemp > 82 ? 'warning' : 'normal',
    },
    {
      name: 'Lubrication Gallery Pressure',
      value: `${oilPress.toFixed(2)} bar`,
      trend: oilPress < 2.8 ? 'down' : 'stable',
      trendLabel: oilPress < 2.8 ? '↓ Slight gallery drop' : 'Stable lubrication barrier',
      status: oilPress < 2.5 ? 'critical' : oilPress < 2.8 ? 'warning' : 'normal',
    },
    {
      name: 'Engine Coolant Temperature',
      value: `${coolantTemp.toFixed(1)}°C`,
      trend: coolantTemp > 88 ? 'up' : 'stable',
      trendLabel: coolantTemp > 88 ? '↑ Thermal creep' : 'Cooling jacket nominal',
      status: coolantTemp > 90 ? 'warning' : 'normal',
    },
    {
      name: 'Mean Engine Duty Load',
      value: `${loadPct.toFixed(0)}%`,
      trend: 'stable',
      trendLabel: 'Balanced power utilization',
      status: 'normal',
    },
    {
      name: 'Hydraulic Temperature Variability (std_1h)',
      value: isDegrading ? '3.4°C' : '1.1°C',
      trend: isDegrading ? 'up' : 'stable',
      trendLabel: isDegrading ? '↑ Elevated thermal variance' : 'Low variance',
      status: isDegrading ? 'warning' : 'normal',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Predictive Health & Component Integrity
          </span>
          <h1 className="text-2xl font-black text-white">Machine Health Diagnostics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Thermodynamic sensor drift, ML failure risk probabilities, and proactive workshop maintenance.
          </p>
        </div>

        <Badge
          variant={
            derivedHealth?.health_status === 'CRITICAL'
              ? 'danger'
              : derivedHealth?.health_status === 'ATTENTION'
              ? 'warning'
              : 'success'
          }
          size="lg"
          dot
        >
          {derivedHealth?.health_status || 'NORMAL'} STATUS
        </Badge>
      </div>

      {/* Top Split: Risk Gauge + Health Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskGauge
          probability={failureRisk?.probability ?? 0.23}
          riskLevel={failureRisk?.riskLevel ?? 'LOW'}
          horizon={failureRisk?.horizon ?? '50 operating hours'}
          signals={failureRisk?.signals ?? ['Hydraulic temp drift', 'Oil pressure nominal']}
          subtitle={`Evaluated for Machine ${activeMachineId}`}
        />

        {/* Health Signals List */}
        <div className="lg:col-span-2">
          <Card
            title="Thermodynamic Health Signals"
            subtitle="Real-time mechanical indicators evaluated against factory baseline tolerances"
            icon={<HeartPulse className="w-4 h-4 text-cat-yellow" />}
          >
            <div className="space-y-2.5">
              {healthSignals.map((sig, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{sig.name}</span>
                    <span className={`text-[11px] font-mono flex items-center gap-1 ${
                      sig.status === 'warning' ? 'text-amber-400' : sig.status === 'critical' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {sig.trendLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-extrabold text-white block">
                      {sig.value}
                    </span>
                    <Badge variant={sig.status === 'warning' ? 'warning' : sig.status === 'critical' ? 'danger' : 'success'} size="sm">
                      {sig.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Predictive Insight & Maintenance Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          title="Predictive Intelligence Insight"
          subtitle="Generated automatically by the background inference engine"
          icon={<Sparkles className="w-4 h-4 text-cat-yellow" />}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-200 leading-relaxed">
              {isDegrading
                ? `Machine ${activeMachineId} is showing a progressive thermal drift in the hydraulic circuit over recent operating periods. Fluid temperatures are operating +8°C above normal baseline while pressure variability has elevated.`
                : `Machine ${activeMachineId} is running with all hydraulic and engine circuits balanced within nominal manufacturer specifications.`}
            </p>

            <div className="rounded border border-amber-600/40 bg-amber-950/20 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                Recommended Preventative Action:
              </span>
              <p className="text-amber-100 font-semibold">
                {derivedHealth?.recommendations?.[0] || 'Schedule hydraulic system filter and cooler inspection before next shift.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Maintenance Work Order Action Card */}
        <Card
          title="Workshop Maintenance Dispatch"
          subtitle="Proactive service order creation"
          icon={<Wrench className="w-4 h-4 text-cyan-400" />}
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Target Equipment:</span>
                <span className="font-mono text-white font-bold">{activeMachineId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Urgency:</span>
                <span className="font-mono text-amber-400 font-bold">Priority Diagnostic (Next Shift)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Target Component:</span>
                <span className="font-mono text-slate-200">Main Hydraulic Pump & Heat Exchanger</span>
              </div>
            </div>

            {serviceRequested ? (
              <div className="p-3 rounded bg-emerald-950/60 border border-emerald-700/60 flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>Work order submitted to site workshop dispatcher.</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => setServiceRequested(true)}
                className="w-full uppercase tracking-wider font-black text-xs py-3"
                icon={<Wrench className="w-4 h-4 mr-1" />}
              >
                Create Maintenance Service Request
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Historical Telemetry & Health Trend Charts */}
      <Card
        title="Thermodynamic Health Trends"
        subtitle="Hydraulic temperature and lubrication pressure historical progression"
        icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
      >
        <LiveTelemetryChart
          defaultMetrics={['hydraulic_temp', 'oil_pressure', 'coolant_temp']}
          height={320}
        />
      </Card>
    </div>
  );
};
