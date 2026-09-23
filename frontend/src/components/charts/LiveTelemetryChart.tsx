import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Play, Pause } from 'lucide-react';
import { TelemetryHistoryPoint, useRealtime } from '../../context/RealtimeContext';
import { useTheme } from '../../context/ThemeContext';

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
    color: '#D97706', // amber
    yAxisId: 'left',
  },
  oil_pressure: {
    key: 'oil_pressure',
    dataKey: 'oil_pressure',
    label: 'Oil Pressure',
    unit: 'bar',
    color: '#0284C7', // sky
    yAxisId: 'right',
  },
  coolant_temp: {
    key: 'coolant_temp',
    dataKey: 'coolant_temp',
    label: 'Coolant Temp',
    unit: '°C',
    color: '#2563EB', // blue
    yAxisId: 'left',
  },
  hydraulic_pressure: {
    key: 'hydraulic_pressure',
    dataKey: 'hydraulic_pressure',
    label: 'Hydraulic Pressure',
    unit: 'bar',
    color: '#059669', // green
    yAxisId: 'right',
  },
  engine_load: {
    key: 'engine_load',
    dataKey: 'load_pct',
    label: 'Engine Load',
    unit: '%',
    color: '#7C3AED', // purple
    yAxisId: 'left',
  },
  rpm: {
    key: 'rpm',
    dataKey: 'rpm',
    label: 'Engine RPM',
    unit: 'rpm',
    color: '#EA580C', // orange
    yAxisId: 'left',
  },
  fuel_rate: {
    key: 'fuel_rate',
    dataKey: 'fuel_rate',
    label: 'Fuel Rate',
    unit: 'L/h',
    color: '#D97706',
    yAxisId: 'right',
  },
  speed_kmh: {
    key: 'speed_kmh',
    dataKey: 'speed_kmh',
    label: 'Ground Speed',
    unit: 'km/h',
    color: '#0D9488', // teal
    yAxisId: 'right',
  },
};

interface LiveTelemetryChartProps {
  defaultMetrics?: TelemetryMetricKey[];
  height?: number | string;
  showControls?: boolean;
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({
  defaultMetrics = ['hydraulic_temp', 'oil_pressure'],
  height = 320,
  showControls = true,
}) => {
  const { telemetryHistory } = useRealtime();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedMetrics, setSelectedMetrics] = useState<TelemetryMetricKey[]>(defaultMetrics);
  const [windowSize, setWindowSize] = useState<number>(30); // 30 points = ~1 min at 2Hz
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [frozenHistory, setFrozenHistory] = useState<TelemetryHistoryPoint[]>([]);

  const toggleMetric = (key: TelemetryMetricKey) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((k) => k !== key);
      } else {
        if (prev.length >= 4) return prev; // Limit to 4 max to prevent chart noise
        return [...prev, key];
      }
    });
  };

  const activePoints = useMemo(() => {
    const raw = isPaused ? frozenHistory : telemetryHistory;
    return raw.slice(-windowSize);
  }, [isPaused, frozenHistory, telemetryHistory, windowSize]);

  const chartData = useMemo(() => {
    return activePoints.map((pt) => {
      const timeStr = pt.timestamp ? pt.timestamp.slice(11, 19) : '';
      return {
        ...pt,
        timeStr,
      };
    });
  }, [activePoints]);

  const stats = useMemo(() => {
    const res: Record<string, { min: number; max: number; current: number }> = {};
    if (chartData.length === 0) return res;

    selectedMetrics.forEach((key) => {
      const dataKey = METRIC_CONFIGS[key].dataKey;
      const values = chartData
        .map((d) => d[dataKey] as number)
        .filter((v) => typeof v === 'number' && !isNaN(v));

      if (values.length > 0) {
        res[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          current: values[values.length - 1],
        };
      }
    });

    return res;
  }, [chartData, selectedMetrics]);

  return (
    <div className="flex flex-col h-full">
      {/* Chart Top Controls */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200 dark:border-cat-border/60">
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
                      ? 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-900 dark:text-white dark:border-slate-700 shadow-sm'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                  style={{
                    borderColor: isSelected ? cfg.color : undefined,
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
            <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border p-0.5 text-xs">
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
                      ? 'bg-cat-yellow text-slate-950 font-black shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (!isPaused) {
                  setFrozenHistory(telemetryHistory);
                }
                setIsPaused((prev) => !prev);
              }}
              title={isPaused ? 'Resume live stream' : 'Pause live stream'}
              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
                isPaused
                  ? 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950/80 dark:border-amber-600 dark:text-amber-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-cat-border dark:text-slate-300 dark:hover:text-white'
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
              className="rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 p-2 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block truncate">
                  {cfg.label}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-num text-lg font-bold text-slate-900 dark:text-white">
                    {st.current.toFixed(key === 'oil_pressure' ? 2 : 1)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{cfg.unit}</span>
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#1F2937' : '#E2E8F0'}
                vertical={false}
              />
              <XAxis
                dataKey="timeStr"
                stroke={isDark ? '#6B7280' : '#94A3B8'}
                fontSize={10}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                stroke={isDark ? '#9CA3AF' : '#64748B'}
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={isDark ? '#9CA3AF' : '#64748B'}
                fontSize={10}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0B0F17' : '#FFFFFF',
                  borderColor: isDark ? '#2A3649' : '#CBD5E1',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                }}
                labelStyle={{ color: isDark ? '#9CA3AF' : '#475569', marginBottom: '4px', fontWeight: 600 }}
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
