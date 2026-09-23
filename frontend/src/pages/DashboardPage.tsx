import React from 'react';
import {
  Cpu,
  Fuel,
  Gauge,
  Thermometer,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LiveTelemetryChart } from '../components/charts/LiveTelemetryChart';
import { RiskGauge } from '../components/charts/RiskGauge';
import { TaskProgressChart } from '../components/charts/TaskProgressChart';
import { InsightCard } from '../components/ai/InsightCard';

export const DashboardPage: React.FC = () => {
  const {
    activeMachineId,
    dashboard,
    latestTelemetry,
    derivedHealth,
    failureRisk,
    safetyStatus,
    activeInsights,
    currentTask,
    acknowledgeInsight,
  } = useRealtime();

  const machineModel = dashboard?.machine?.machine_model || '320 GC Excavator';
  const hours = dashboard?.current_state?.engine_hours || 1284;
  const fuelPct = dashboard?.current_state?.fuel_level_l
    ? Math.round((dashboard.current_state.fuel_level_l / 400) * 100)
    : 67;

  // Real-time instantaneous values
  const rpm = latestTelemetry?.rpm ?? dashboard?.current_state?.engine_rpm ?? 1840;
  const loadPct = latestTelemetry?.load_pct ?? dashboard?.current_state?.engine_load_pct ?? 61;
  const hydTemp = latestTelemetry?.hydraulic_temp ?? dashboard?.current_state?.hydraulic_temp_c ?? 71;
  const hydPress = latestTelemetry?.hydraulic_pressure ?? dashboard?.current_state?.hydraulic_pressure_bar ?? 241;
  const coolantTemp = latestTelemetry?.coolant_temp ?? dashboard?.current_state?.coolant_temp_c ?? 82;
  const oilPress = latestTelemetry?.oil_pressure ?? dashboard?.current_state?.oil_pressure_bar ?? 3.8;
  const fuelRate = latestTelemetry?.fuel_rate ?? dashboard?.current_state?.fuel_rate_l_hr ?? 8.4;
  const speed = latestTelemetry?.speed_kmh ?? dashboard?.current_state?.speed_kmh ?? 4.2;

  // Health evaluations
  const isHydHot = hydTemp > 82;
  const isOilLow = oilPress < 2.5;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Greeting & Machine Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Operator Console · Active Shift
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Good morning, Alex.
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Here's your live machine telemetry, task progress, and predictive health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-900 border border-cat-border px-3.5 py-2 flex items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Primary Machine
              </span>
              <span className="font-mono text-sm font-black text-white">{activeMachineId}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Status</span>
              <Badge variant={isHydHot || isOilLow ? 'warning' : 'success'} size="sm" dot>
                {latestTelemetry?.status || 'OPERATIONAL'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Machine Status Hero Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Engine Hours"
          value={hours.toFixed(0)}
          unit="h"
          subtitle="Cumulative runtime"
          icon={<Clock className="w-4 h-4 text-slate-400" />}
        />
        <MetricCard
          label="Fuel Level"
          value={fuelPct}
          unit="%"
          subtitle="400L total capacity"
          trend="down"
          status={fuelPct < 25 ? 'warning' : 'telemetry'}
          icon={<Fuel className="w-4 h-4 text-cat-yellow" />}
        />
        <MetricCard
          label="Engine Load"
          value={loadPct}
          unit="%"
          decimals={0}
          trend={loadPct > 80 ? 'up' : 'stable'}
          status={loadPct > 85 ? 'warning' : 'telemetry'}
          icon={<Zap className="w-4 h-4 text-purple-400" />}
        />
        <MetricCard
          label="Hydraulic Temp"
          value={hydTemp}
          unit="°C"
          decimals={1}
          trend={isHydHot ? 'up' : 'stable'}
          trendValue={isHydHot ? '+8°C drift' : undefined}
          status={hydTemp > 85 ? 'critical' : isHydHot ? 'warning' : 'telemetry'}
          icon={<Thermometer className="w-4 h-4 text-amber-400" />}
        />
        <MetricCard
          label="Hydraulic Pressure"
          value={hydPress}
          unit="bar"
          decimals={0}
          status="telemetry"
          icon={<Gauge className="w-4 h-4 text-emerald-400" />}
        />
        <MetricCard
          label="Ground Speed"
          value={speed}
          unit="km/h"
          decimals={1}
          subtitle="Under working limit"
          icon={<Activity className="w-4 h-4 text-teal-400" />}
        />
      </div>

      {/* 3. Core Split: Live Telemetry Sparklines + Dynamic Task ETA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Telemetry Chart */}
        <div className="lg:col-span-2">
          <Card
            title="Live Telemetry Streaming"
            subtitle="Real-time sensor channels via WebSocket (/ws/machines)"
            icon={<Activity className="w-4 h-4 text-cyan-400" />}
            badge={<Badge variant="info" size="sm" dot>STREAMING</Badge>}
          >
            <LiveTelemetryChart
              defaultMetrics={['hydraulic_temp', 'oil_pressure']}
              height={290}
            />
          </Card>
        </div>

        {/* Right 1 Col: Current Task & Dynamic ML ETA */}
        <div className="space-y-4">
          <TaskProgressChart
            task={currentTask}
            currentPayload={latestTelemetry?.payload_tonnes || 18.5}
            currentCycleTime={38}
          />
        </div>
      </div>

      {/* 4. Guardian & Health Risk Trio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* In-Cab Safety Guardian */}
        <Card
          title="Safety Guardian"
          subtitle="In-cab compliance & proximity sensors"
          icon={
            safetyStatus.proximity || !safetyStatus.seatbelt ? (
              <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )
          }
          badge={
            <Badge
              variant={
                safetyStatus.proximity || !safetyStatus.seatbelt
                  ? 'danger'
                  : safetyStatus.overspeed
                  ? 'warning'
                  : 'success'
              }
              size="sm"
            >
              {safetyStatus.proximity || !safetyStatus.seatbelt ? 'ATTENTION' : 'COMPLIANT'}
            </Badge>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-cat-border text-xs">
              <span className="text-slate-300 font-medium">Operator Seatbelt</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  safetyStatus.seatbelt ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {safetyStatus.seatbelt ? '✓ FASTENED' : '⚠ UNBUCKLED'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-cat-border text-xs">
              <span className="text-slate-300 font-medium">360° Proximity Radar</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  safetyStatus.proximity ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {safetyStatus.proximity ? '⚠ OBJECT DETECTED' : '✓ CLEAR'}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-cat-border text-xs">
              <span className="text-slate-300 font-medium">Speed Monitoring</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {speed.toFixed(1)} km/h (Nominal)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-slate-900/80 border border-cat-border text-xs">
              <span className="text-slate-300 font-medium">Unsafe Operation Risk</span>
              <span className="font-mono font-bold text-cat-yellow">
                {(safetyStatus.unsafeProbability30m * 100).toFixed(0)}% (LOW)
              </span>
            </div>
          </div>
        </Card>

        {/* Predictive Failure Risk */}
        <RiskGauge
          probability={failureRisk?.probability ?? 0.23}
          riskLevel={failureRisk?.riskLevel ?? 'LOW'}
          horizon={failureRisk?.horizon ?? '50 operating hours'}
          signals={failureRisk?.signals ?? ['Hydraulic temp drift', 'Oil pressure nominal']}
          subtitle="Trained Random Forest Inference"
        />

        {/* Machine Derived Health & Diagnostics */}
        <Card
          title="Derived Machine Health"
          subtitle="Thermodynamic equilibrium & fault codes"
          icon={<Cpu className="w-4 h-4 text-cat-yellow" />}
          badge={
            <Badge
              variant={
                derivedHealth?.health_status === 'CRITICAL'
                  ? 'danger'
                  : derivedHealth?.health_status === 'ATTENTION'
                  ? 'warning'
                  : 'success'
              }
              size="sm"
            >
              {derivedHealth?.health_status || 'NORMAL'}
            </Badge>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Degradation Trend:</span>
              <span className="font-mono font-bold text-white">
                {derivedHealth?.trend || 'STABLE'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Diagnostic Fault Code:</span>
              <span className="font-mono font-bold text-cat-yellow">
                {derivedHealth?.recent_fault_code || 'NONE'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Active Anomalies:
              </span>
              {derivedHealth?.active_anomalies && derivedHealth.active_anomalies.length > 0 ? (
                <ul className="space-y-1">
                  {derivedHealth.active_anomalies.map((anom, idx) => (
                    <li key={idx} className="text-amber-300 flex items-start gap-1 font-mono text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{anom}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-emerald-400 font-medium">No mechanical anomalies active</span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 block mb-0.5">Recommendation:</span>
              <p className="italic">
                {derivedHealth?.recommendations?.[0] || 'Continue standard operation.'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Actionable AI Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cat-yellow" />
            <h2 className="text-xs uppercase font-black tracking-wider text-slate-300">
              Active Intelligence Insights & Interventions
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {activeInsights.length} actionable suggestions
          </span>
        </div>

        {activeInsights.length === 0 ? (
          <div className="industrial-card rounded-lg p-6 text-center text-slate-500">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
            <p className="text-xs font-semibold text-slate-400">
              Zero Unacknowledged Telematics Anomalies
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The intelligence engine reports all machine circuits are operating within baseline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInsights.map((insight) => (
              <InsightCard
                key={insight.insight_id}
                insight={insight}
                onAcknowledge={acknowledgeInsight}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
