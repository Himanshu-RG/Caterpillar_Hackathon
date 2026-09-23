import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Play, Pause, Maximize2, RotateCcw } from 'lucide-react';
import { TelemetryHistoryPoint, useRealtime } from '../../context/RealtimeContext';
import { Button } from '../common/Button';

export type TelemetryMetricKey =
  | 'hydraulic_temp'
  | 'oil_pressure'
  | 'coolant_temp'
  | 'hydraulic_pressure'
  | 'engine_load'
  | 'rpm'
  | 'fuel_rate'
  | 'speed_kmh';

interface MetricConfig {
  key: TelemetryMetricKey;
  dataKey: keyof TelemetryHistoryPoint;
  label: string;
  unit: string;
  color: string;
  yAxisId: 'left' | 'right';
  domain?: [number, number];
}

const METRIC_CONFIGS: Record<TelemetryMetricKey, MetricConfig> = {
  hydraulic_temp: {
    key: 'hydraulic_temp',
    dataKey: 'hydraulic_temp',
    label: 'Hydraulic Temp',
    unit: '°C',
    color: '#F59E0B', // amber
    yAxisId: 'left',
  },
  oil_pressure: {
    key: 'oil_pressure',
    dataKey: 'oil_pressure',
    label: 'Oil Pressure',
    unit: 'bar',
    color: '#06B6D4', // cyan
    yAxisId: 'right',
  },
  coolant_temp: {
    key: 'coolant_temp',
    dataKey: 'coolant_temp',
    label: 'Coolant Temp',
    unit: '°C',
    color: '#3B82F6', // blue
    yAxisId: 'left',
  },
  hydraulic_pressure: {
    key: 'hydraulic_pressure',
    dataKey: 'hydraulic_pressure',
    label: 'Hydraulic Pressure',
    unit: 'bar',
    color: '#10B981', // green
    yAxisId: 'right',
  },
  engine_load: {
    key: 'engine_load',
    dataKey: 'load_pct',
    label: 'Engine Load',
    unit: '%',
    color: '#8B5CF6', // purple
    yAxisId: 'left',
  },
  rpm: {
    key: 'rpm',
    dataKey: 'rpm',
    label: 'Engine RPM',
    unit: 'RPM',
    color: '#EC4899', // pink
    yAxisId: 'left',
  },
  fuel_rate: {
    key: 'fuel_rate',
    dataKey: 'fuel_rate',
    label: 'Fuel Rate',
    unit: 'L/h',
    color: '#EAB308', // yellow
    yAxisId: 'right',
  },
  speed_kmh: {
    key: 'speed_kmh',
    dataKey: 'speed_kmh',
    label: 'Travel Speed',
    unit: 'km/h',
    color: '#14B8A6', // teal
    yAxisId: 'right',
  },
};

interface LiveTelemetryChartProps {
  defaultMetrics?: TelemetryMetricKey[];
  height?: number;
  showControls?: boolean;
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  defaultMetrics = ['hydraulic_temp', 'oil_pressure'],
  height = 280,
  showControls = true,
}) => {
  const { telemetryHistory, isPaused, setIsPaused } = useRealtime();
  const [selectedMetrics, setSelectedMetrics] = useState<TelemetryMetricKey[]>(defaultMetrics);
  const [windowSize, setWindowSize] = useState<number>(60); // 30, 60, 120 points

  const toggleMetric = (key: TelemetryMetricKey) => {
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter((m) => m !== key));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, key]);
    }
  };

  const chartData = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) return [];
    return telemetryHistory.slice(-windowSize);
  }, [telemetryHistory, windowSize]);

  // Current, Min, Max stats for selected metrics
  const stats = useMemo(() => {
    if (chartData.length === 0) return {};
    const res: Record<string, { current: number; min: number; max: number }> = {};

    selectedMetrics.forEach((mKey) => {
      const field = METRIC_CONFIGS[mKey].dataKey;
      const values = chartData.map((d) => Number(d[field]) || 0);
      const current = values[values.length - 1] ?? 0;
      const min = Math.min(...values);
      const max = Math.max(...values);
      res[mKey] = { current, min, max };
    });

    return res;
  }, [chartData, selectedMetrics]);

  return (
    <div className="flex flex-col h-full">
      {/* Chart Top Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-cat-border/60">
          {/* Metric Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(METRIC_CONFIGS) as TelemetryMetricKey[]).map((key) => {
              const cfg = METRIC_CONFIGS[key];
              const isSelected = selectedMetrics.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase transition-colors border ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                  style={{
                    borderColor: isSelected ? cfg.color : 'transparent',
                    color: isSelected ? cfg.color : undefined,
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: cfg.color }}
                  />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Time Window & Pause Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded bg-slate-900 border border-cat-border p-0.5 text-xs">
              {[
                { label: '5m', points: 30 },
                { label: '15m', points: 60 },
                { label: '30m', points: 120 },
              ].map((w) => (
                <button
                  key={w.label}
                  onClick={() => setWindowSize(w.points)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                    windowSize === w.points
                      ? 'bg-cat-yellow text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPaused((prev) => !prev)}
              title={isPaused ? 'Resume live stream' : 'Pause live stream'}
              className={`p-1.5 rounded border text-xs font-bold flex items-center gap-1 transition-colors ${
                isPaused
                  ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                  : 'bg-slate-900 border-cat-border text-slate-300 hover:text-white'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="text-[10px] uppercase">{isPaused ? 'PAUSED' : 'LIVE'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Numerical Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
        {selectedMetrics.map((key) => {
          const cfg = METRIC_CONFIGS[key];
          const st = stats[key];
          if (!st) return null;
          return (
            <div
              key={key}
              className="rounded bg-slate-900/60 border border-slate-800 p-2 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block truncate">
                  {cfg.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-num text-lg font-bold text-white">
                    {st.current.toFixed(key === 'oil_pressure' ? 2 : 1)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{cfg.unit}</span>
                </div>
              </div>
              <div className="text-right text-[10px] font-mono text-slate-500">
                <div>MIN: {st.min.toFixed(1)}</div>
                <div>MAX: {st.max.toFixed(1)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Chart */}
      <div style={{ width: '100%', height }} className="relative">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Waiting for live telemetry stream packets...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="timeStr"
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B0F17',
                  borderColor: '#2A3649',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                }}
                labelStyle={{ color: '#9CA3AF', marginBottom: '4px', fontWeight: 600 }}
              />
              {selectedMetrics.map((key) => {
                const cfg = METRIC_CONFIGS[key];
                return (
                  <Line
                    key={key}
                    yAxisId={cfg.yAxisId}
                    type="monotone"
                    dataKey={cfg.dataKey}
                    name={`${cfg.label} (${cfg.unit})`}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
