import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  MachineDashboard,
  WebSocketTelemetryPayload,
  Insight,
  SafetyAlert,
  Task,
  DerivedHealth,
} from '../types/telematics';
import { fetchMachineDashboard } from '../api/machines';
import { acknowledgeInsight as apiAcknowledgeInsight } from '../api/insights';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface CriticalAlertInfo {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH';
  time: string;
  machine_id: string;
  recommended_action: string;
}

export interface TelemetryHistoryPoint {
  timestamp: string;
  timeStr: string;
  rpm: number;
  load_pct: number;
  coolant_temp: number;
  oil_pressure: number;
  hydraulic_temp: number;
  hydraulic_pressure: number;
  fuel_rate: number;
  speed_kmh: number;
  payload_tonnes: number;
}

interface RealtimeContextType {
  activeMachineId: string;
  setActiveMachineId: (id: string) => void;
  connectionStatus: ConnectionStatus;
  dashboard: MachineDashboard | null;
  latestTelemetry: WebSocketTelemetryPayload['telemetry'] | null;
  telemetryHistory: TelemetryHistoryPoint[];
  derivedHealth: DerivedHealth | null;
  failureRisk: {
    probability: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    signals: string[];
    horizon: string;
  } | null;
  safetyStatus: {
    seatbelt: boolean;
    proximity: boolean;
    overspeed: boolean;
    unsafeProbability30m: number;
    violationsCount: number;
  };
  activeSafetyAlerts: SafetyAlert[];
  activeInsights: Insight[];
  currentTask: Task | null;
  criticalAlert: CriticalAlertInfo | null;
  dismissCriticalAlert: () => void;
  acknowledgeInsight: (insightId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  isPaused: boolean;
  setIsPaused: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeScenario: string;
  setActiveScenario: (name: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
const MAX_HISTORY = 120;

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMachineId, setActiveMachineId] = useState<string>('EXC007');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [dashboard, setDashboard] = useState<MachineDashboard | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<WebSocketTelemetryPayload['telemetry'] | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryHistoryPoint[]>([]);
  const [derivedHealth, setDerivedHealth] = useState<DerivedHealth | null>(null);
  const [failureRisk, setFailureRisk] = useState<{
    probability: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    signals: string[];
    horizon: string;
  } | null>(null);
  const [safetyStatus, setSafetyStatus] = useState({
    seatbelt: true,
    proximity: false,
    overspeed: false,
    unsafeProbability30m: 0.05,
    violationsCount: 0,
  });
  const [activeSafetyAlerts, setActiveSafetyAlerts] = useState<SafetyAlert[]>([]);
  const [activeInsights, setActiveInsights] = useState<Insight[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [criticalAlert, setCriticalAlert] = useState<CriticalAlertInfo | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string>('degrading');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  // 1. Initial REST Dashboard Fetch
  const refreshDashboard = useCallback(async () => {
    try {
      const data = await fetchMachineDashboard(activeMachineId);
      setDashboard(data);
      if (data.current_state) {
        setLatestTelemetry({
          rpm: data.current_state.engine_rpm,
          load_pct: data.current_state.engine_load_pct,
          coolant_temp: data.current_state.coolant_temp_c,
          oil_pressure: data.current_state.oil_pressure_bar,
          hydraulic_temp: data.current_state.hydraulic_temp_c,
          hydraulic_pressure: data.current_state.hydraulic_pressure_bar,
          status: data.current_state.machine_status,
          fuel_rate: data.current_state.fuel_rate_l_hr,
          speed_kmh: data.current_state.speed_kmh,
          payload_tonnes: data.current_state.payload_tonnes,
          fault_code: data.current_state.fault_code,
        });

        // Initialize historical point
        const timeStr = data.current_state.last_timestamp ? data.current_state.last_timestamp.slice(11, 19) : '--:--:--';
        setTelemetryHistory([
          {
            timestamp: data.current_state.last_timestamp,
            timeStr,
            rpm: data.current_state.engine_rpm || 1650,
            load_pct: data.current_state.engine_load_pct || 55,
            coolant_temp: data.current_state.coolant_temp_c || 82,
            oil_pressure: data.current_state.oil_pressure_bar || 3.8,
            hydraulic_temp: data.current_state.hydraulic_temp_c || 68,
            hydraulic_pressure: data.current_state.hydraulic_pressure_bar || 240,
            fuel_rate: data.current_state.fuel_rate_l_hr || 7.5,
            speed_kmh: data.current_state.speed_kmh || 0,
            payload_tonnes: data.current_state.payload_tonnes || 0,
          },
        ]);

        setSafetyStatus({
          seatbelt: data.current_state.seatbelt_status,
          proximity: data.current_state.proximity_alert,
          overspeed: data.current_state.overspeed_alert,
          unsafeProbability30m: 0.1,
          violationsCount: data.safety_alerts.length,
        });
      }

      if (data.health) {
        setDerivedHealth(data.health);
      }

      if (data.failure_prediction) {
        setFailureRisk({
          probability: data.failure_prediction.failure_probability,
          riskLevel: data.failure_prediction.risk_level,
          signals: data.failure_prediction.top_contributing_signals,
          horizon: data.failure_prediction.prediction_horizon,
        });
      }

      if (data.safety_alerts) {
        setActiveSafetyAlerts(data.safety_alerts);
      }

      if (data.recent_insights) {
        setActiveInsights(data.recent_insights);
      }

      if (data.active_task) {
        setCurrentTask(data.active_task);
      }
    } catch (err) {
      console.warn('[RealtimeContext] Could not fetch initial dashboard:', err);
    }
  }, [activeMachineId]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // 2. WebSocket Connection with Exponential Backoff
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('CONNECTING');
    const wsUrl = `${WS_BASE_URL}/ws/machines/${activeMachineId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const packet: WebSocketTelemetryPayload = JSON.parse(event.data);
          if (!packet || !packet.telemetry) return;

          // Check for pause
          if (isPausedRef.current) return;

          // Update Latest Telemetry
          setLatestTelemetry(packet.telemetry);

          // Append to bounded sliding window history
          const timeStr = packet.timestamp ? packet.timestamp.slice(11, 19) : new Date().toLocaleTimeString();
          setTelemetryHistory((prev) => {
            const nextPoint: TelemetryHistoryPoint = {
              timestamp: packet.timestamp,
              timeStr,
              rpm: packet.telemetry.rpm ?? 0,
              load_pct: packet.telemetry.load_pct ?? 0,
              coolant_temp: packet.telemetry.coolant_temp ?? 0,
              oil_pressure: packet.telemetry.oil_pressure ?? 0,
              hydraulic_temp: packet.telemetry.hydraulic_temp ?? 0,
              hydraulic_pressure: packet.telemetry.hydraulic_pressure ?? 0,
              fuel_rate: packet.telemetry.fuel_rate ?? 0,
              speed_kmh: packet.telemetry.speed_kmh ?? 0,
              payload_tonnes: packet.telemetry.payload_tonnes ?? 0,
            };
            const updated = [...prev, nextPoint];
            return updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;
          });

          // Update Safety
          if (packet.safety) {
            setSafetyStatus((prev) => ({
              ...prev,
              seatbelt: packet.safety.seatbelt ?? prev.seatbelt,
              proximity: packet.safety.proximity ?? prev.proximity,
              overspeed: packet.safety.overspeed ?? prev.overspeed,
              violationsCount: packet.safety.violations_count ?? prev.violationsCount,
              unsafeProbability30m: packet.predictions?.unsafe_probability_30m ?? prev.unsafeProbability30m,
            }));

            // Check for critical alert popup
            if (packet.safety.proximity) {
              setCriticalAlert({
                id: `CRIT-PROX-${Date.now()}`,
                title: 'CRITICAL PROXIMITY HAZARD',
                message: 'Personnel or structure detected within obstacle perimeter (< 3.5m).',
                severity: 'CRITICAL',
                time: timeStr,
                machine_id: packet.machine_id,
                recommended_action: 'HALT MACHINE MOTION IMMEDIATELY. Sound horn and verify spotters.',
              });
            } else if (packet.safety.seatbelt === false && (packet.telemetry.speed_kmh ?? 0) > 1.0) {
              setCriticalAlert({
                id: `CRIT-SEAT-${Date.now()}`,
                title: 'SEATBELT UNFASTENED IN MOTION',
                message: 'Machine is actively in gear without operator seatbelt buckled.',
                severity: 'CRITICAL',
                time: timeStr,
                machine_id: packet.machine_id,
                recommended_action: 'Fasten safety belt immediately before continuing travel.',
              });
            }
          }

          // Update ML Predictions
          if (packet.predictions) {
            setFailureRisk({
              probability: packet.predictions.failure_probability ?? 0.0,
              riskLevel: packet.predictions.risk_level ?? 'LOW',
              signals: packet.predictions.signals ?? [],
              horizon: '50 operating hours',
            });
          }

          // Update Insights
          if (packet.insights && packet.insights.length > 0) {
            setActiveInsights((prev) => {
              const map = new Map<string, Insight>();
              for (const ins of prev) map.set(ins.insight_id, ins);
              for (const ins of packet.insights) {
                map.set(ins.insight_id, {
                  insight_id: ins.insight_id,
                  timestamp: packet.timestamp,
                  machine_id: packet.machine_id,
                  type: ins.type || 'PREDICTIVE_MAINTENANCE',
                  severity: ins.severity || 'HIGH',
                  title: ins.title,
                  message: ins.message || '',
                  recommended_action: ins.recommended_action,
                  source: 'INTELLIGENCE_ENGINE',
                  status: ins.status || 'ACTIVE',
                });
              }
              return Array.from(map.values()).slice(0, 10);
            });
          }
        } catch (err) {
          console.warn('[WS Parse Error]:', err);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('DISCONNECTED');
      };

      ws.onclose = () => {
        setConnectionStatus('DISCONNECTED');
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 8000);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };
    } catch (e) {
      setConnectionStatus('DISCONNECTED');
    }
  }, [activeMachineId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Acknowledge Insight Handler
  const acknowledgeInsight = async (insightId: string) => {
    try {
      await apiAcknowledgeInsight(insightId);
      setActiveInsights((prev) =>
        prev.map((ins) => (ins.insight_id === insightId ? { ...ins, status: 'ACKNOWLEDGED' } : ins))
      );
    } catch (e) {
      console.warn('[Acknowledge Error]:', e);
    }
  };

  const dismissCriticalAlert = () => {
    setCriticalAlert(null);
  };

  return (
    <RealtimeContext.Provider
      value={{
        activeMachineId,
        setActiveMachineId,
        connectionStatus,
        dashboard,
        latestTelemetry,
        telemetryHistory,
        derivedHealth,
        failureRisk,
        safetyStatus,
        activeSafetyAlerts,
        activeInsights,
        currentTask,
        criticalAlert,
        dismissCriticalAlert,
        acknowledgeInsight,
        refreshDashboard,
        isPaused,
        setIsPaused,
        activeScenario,
        setActiveScenario,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
