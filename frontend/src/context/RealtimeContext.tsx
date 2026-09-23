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
import { startSimulator, stopSimulator, fetchSimulatorStatus } from '../api/simulator';

import { telemetryBuffer } from '../offline/telemetryBuffer';

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

export interface OperatorInfo {
  id: string;
  name: string;
  role: string;
  shift: string;
}

interface RealtimeContextType {
  activeMachineId: string;
  setActiveMachineId: (id: string) => void;
  operator: OperatorInfo;
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
  startTask: (task: Task) => void;
  pauseCurrentTask: () => void;
  completeCurrentTask: () => void;
  criticalAlert: CriticalAlertInfo | null;
  triggerSecurityAlert: (info?: Partial<CriticalAlertInfo>) => void;
  dismissCriticalAlert: () => void;
  acknowledgeInsight: (insightId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  isPaused: boolean;
  setIsPaused: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeScenario: string;
  setActiveScenario: (name: string) => void;
  isSimulating: boolean;
  startStreamSimulator: (scenario?: string, speed?: number) => Promise<void>;
  stopStreamSimulator: () => Promise<void>;
  toggleStreamSimulator: () => Promise<void>;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (val: boolean) => void;
  reconnectWebSocket: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';
const MAX_HISTORY = 120;

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMachineId, setActiveMachineId] = useState<string>('EXC007');
  const [operator] = useState<OperatorInfo>({
    id: 'OP001',
    name: 'Alex Johnson',
    role: 'Certified Heavy Equipment Operator',
    shift: 'Day Shift (07:00 – 19:00)',
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('DISCONNECTED');
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const isSimulatedOfflineRef = useRef<boolean>(false);
  isSimulatedOfflineRef.current = isSimulatedOffline;
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
  const lastDismissedHazardRef = useRef<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string>('healthy');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Sync with simulator status on mount
  useEffect(() => {
    let mounted = true;
    fetchSimulatorStatus()
      .then((status) => {
        if (mounted && status) {
          setIsSimulating(Boolean(status.is_running));
          if (status.current_scenario) setActiveScenario(status.current_scenario);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const startStreamSimulator = useCallback(
    async (scenario?: string, speed = 2.0) => {
      const targetScenario = scenario || activeScenario;
      try {
        await startSimulator(targetScenario, activeMachineId, speed);
        setIsSimulating(true);
        if (scenario) setActiveScenario(scenario);
      } catch (err) {
        console.warn('Could not start stream simulator:', err);
      }
    },
    [activeMachineId, activeScenario]
  );

  const stopStreamSimulator = useCallback(async () => {
    try {
      await stopSimulator();
      setIsSimulating(false);
    } catch (err) {
      console.warn('Could not stop stream simulator:', err);
    }
  }, []);

  const toggleStreamSimulator = useCallback(async () => {
    if (isSimulating) {
      await stopStreamSimulator();
    } else {
      await startStreamSimulator();
    }
  }, [isSimulating, stopStreamSimulator, startStreamSimulator]);

  // Single-Task Operator Actions: Operator only works on 1 task at a time
  const startTask = useCallback((task: Task) => {
    setCurrentTask(task);
  }, []);

  const pauseCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  const completeCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  // Security Alert Trigger (accessible everywhere and testable)
  const triggerSecurityAlert = useCallback((info?: Partial<CriticalAlertInfo>) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setCriticalAlert({
      id: info?.id || `ALERT-SEC-${Date.now()}`,
      title: info?.title || 'SECURITY ALERT: UNAUTHORIZED PERIMETER INTRUSION',
      message: info?.message || 'Ground personnel or unauthorized vehicle detected inside the heavy equipment active swing and blast boundary (< 5.0m).',
      severity: info?.severity || 'CRITICAL',
      time: info?.time || timeStr,
      machine_id: info?.machine_id || activeMachineId,
      recommended_action: info?.recommended_action || 'HALT MACHINE MOTION IMMEDIATELY. Sound in-cab horn, engage hydraulic safety lock, and verify ground spotter clear.',
    });
  }, [activeMachineId]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;
  const isMountedRef = useRef<boolean>(true);

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

        // If initial machine state has an unfastened seatbelt or proximity hazard, trigger the Security Alert prompt box
        if (!data.current_state.seatbelt_status && lastDismissedHazardRef.current !== 'seatbelt') {
          const timeStr = data.current_state.last_timestamp ? data.current_state.last_timestamp.slice(11, 19) : new Date().toLocaleTimeString();
          setCriticalAlert({
            id: `CRIT-SEAT-${Date.now()}`,
            title: 'IMMEDIATE SAFETY ALERT: SEATBELT UNFASTENED',
            message: 'Seatbelt is unfastened while machine is active. Fasten safety harness before operating hydraulics or tramming.',
            severity: 'CRITICAL',
            time: timeStr,
            machine_id: activeMachineId,
            recommended_action: 'FASTEN SAFETY HARNESS IMMEDIATELY. In-cab lockout active until operator is buckled.',
          });
        } else if (data.current_state.proximity_alert && lastDismissedHazardRef.current !== 'proximity') {
          const timeStr = data.current_state.last_timestamp ? data.current_state.last_timestamp.slice(11, 19) : new Date().toLocaleTimeString();
          setCriticalAlert({
            id: `CRIT-PROX-${Date.now()}`,
            title: 'SECURITY ALERT: WORKER / OBSTACLE IN PERIMETER',
            message: 'Proximity radar detected an obstacle or personnel within equipment danger zone (< 3.5m).',
            severity: 'CRITICAL',
            time: timeStr,
            machine_id: activeMachineId,
            recommended_action: 'HALT MACHINE MOTION IMMEDIATELY. Sound in-cab horn and verify 360° clearance.',
          });
        }
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

  // 2. WebSocket Connection with Clean Handler Detachment & Backoff
  const connectWebSocket = useCallback(() => {
    // 1. Clear any pending reconnect timer
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 2. Detach handlers from existing socket before closing to prevent ghost reconnect loop
    if (wsRef.current) {
      const oldWs = wsRef.current;
      wsRef.current = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {
        // ignore
      }
    }

    if (!isMountedRef.current) return;

    setConnectionStatus('CONNECTING');
    const wsUrl = `${WS_BASE_URL}/ws/machines/${activeMachineId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws || !isMountedRef.current) return;
        setConnectionStatus('CONNECTED');
        reconnectAttemptsRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws || !isMountedRef.current) return;
        try {
          const packet: WebSocketTelemetryPayload = JSON.parse(event.data);
          if (!packet || !packet.telemetry) return;

          // Check for pause or simulated offline drop
          if (isPausedRef.current || isSimulatedOfflineRef.current) return;

          // Feed into in-cab rolling telemetry buffer
          telemetryBuffer.addPacket(packet);

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
            const sb = packet.safety.seatbelt ?? true;
            const prox = packet.safety.proximity ?? false;

            setSafetyStatus((prev) => ({
              ...prev,
              seatbelt: packet.safety.seatbelt ?? prev.seatbelt,
              proximity: packet.safety.proximity ?? prev.proximity,
              overspeed: packet.safety.overspeed ?? prev.overspeed,
              violationsCount: packet.safety.violations_count ?? prev.violationsCount,
              unsafeProbability30m: packet.predictions?.unsafe_probability_30m ?? prev.unsafeProbability30m,
            }));

            // Reset dismissed state when hazard condition clears
            if (sb && lastDismissedHazardRef.current === 'seatbelt') {
              lastDismissedHazardRef.current = null;
            }
            if (!prox && lastDismissedHazardRef.current === 'proximity') {
              lastDismissedHazardRef.current = null;
            }

            // Check for critical alert popup
            if (prox && lastDismissedHazardRef.current !== 'proximity') {
              setCriticalAlert({
                id: `CRIT-PROX-${Date.now()}`,
                title: 'SECURITY ALERT: WORKER / OBSTACLE IN PERIMETER',
                message: 'Personnel or structure detected within obstacle perimeter (< 3.5m).',
                severity: 'CRITICAL',
                time: timeStr,
                machine_id: packet.machine_id,
                recommended_action: 'HALT MACHINE MOTION IMMEDIATELY. Sound horn, engage safety brake, and notify supervisor.',
              });
            } else if (!sb && lastDismissedHazardRef.current !== 'seatbelt') {
              setCriticalAlert({
                id: `CRIT-SEAT-${Date.now()}`,
                title: 'IMMEDIATE SAFETY ALERT: SEATBELT UNFASTENED',
                message: 'Operator seatbelt is unfastened while machine is active. Operating heavy equipment without restraint poses severe hazard.',
                severity: 'CRITICAL',
                time: timeStr,
                machine_id: packet.machine_id,
                recommended_action: 'FASTEN SAFETY HARNESS IMMEDIATELY. In-cab motion locked until buckled.',
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

          // Update Derived Health dynamically from live telematics & ML
          if (packet.predictions || packet.telemetry) {
            const hyd = packet.telemetry?.hydraulic_temp ?? 70;
            const oil = packet.telemetry?.oil_pressure ?? 3.8;
            const cool = packet.telemetry?.coolant_temp ?? 82;
            const risk = packet.predictions?.risk_level ?? 'LOW';
            const failProb = packet.predictions?.failure_probability ?? 0.04;

            let liveStatus: 'NORMAL' | 'ATTENTION' | 'CRITICAL' = 'NORMAL';
            if (risk === 'HIGH' || hyd >= 88 || oil <= 2.4 || cool >= 94) {
              liveStatus = 'CRITICAL';
            } else if (risk === 'MEDIUM' || hyd >= 80 || oil <= 2.8 || cool >= 89) {
              liveStatus = 'ATTENTION';
            }

            let liveTrend: 'STABLE' | 'DEGRADING' | 'CRITICAL' = 'STABLE';
            if (liveStatus === 'CRITICAL') liveTrend = 'CRITICAL';
            else if (liveStatus === 'ATTENTION') liveTrend = 'DEGRADING';

            setDerivedHealth((prev) => ({
              machine_id: packet.machine_id || prev?.machine_id || activeMachineId,
              health_status: liveStatus,
              failure_probability: failProb,
              trend: liveTrend,
              prediction_horizon: '50 operating hours',
              active_anomalies: hyd >= 80 ? ['Elevated Hydraulic Temperature'] : [],
              recent_fault_code: packet.telemetry?.fault_code || prev?.recent_fault_code || 'NONE',
              recommendations: packet.predictions?.signals ?? prev?.recommendations ?? [],
            }));
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
        if (wsRef.current !== ws || !isMountedRef.current) return;
      };

      ws.onclose = () => {
        // Discard close events from old or abandoned sockets
        if (wsRef.current !== ws || !isMountedRef.current) return;

        setConnectionStatus('DISCONNECTED');
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 8000);
        reconnectAttemptsRef.current += 1;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket();
          }
        }, delay);
      };
    } catch (e) {
      if (isMountedRef.current) {
        setConnectionStatus('DISCONNECTED');
      }
    }
  }, [activeMachineId]);

  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();

    // Heartbeat ping every 25 seconds to keep connection alive through proxies/NAT
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send('ping');
        } catch {
          // ignore
        }
      }
    }, 25000);

    return () => {
      isMountedRef.current = false;
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const oldWs = wsRef.current;
        wsRef.current = null;
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onerror = null;
        oldWs.onclose = null;
        try {
          oldWs.close();
        } catch {
          // ignore
        }
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
    if (criticalAlert) {
      if (criticalAlert.id.includes('SEAT') || criticalAlert.title.includes('SEATBELT')) {
        lastDismissedHazardRef.current = 'seatbelt';
      } else if (
        criticalAlert.id.includes('PROX') ||
        criticalAlert.title.includes('PROXIMITY') ||
        criticalAlert.title.includes('PERIMETER') ||
        criticalAlert.title.includes('WORKER')
      ) {
        lastDismissedHazardRef.current = 'proximity';
      }
    }
    setCriticalAlert(null);
  };

  const reconnectWebSocket = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  }, [connectWebSocket]);

  return (
    <RealtimeContext.Provider
      value={{
        activeMachineId,
        setActiveMachineId,
        operator,
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
        startTask,
        pauseCurrentTask,
        completeCurrentTask,
        criticalAlert,
        triggerSecurityAlert,
        dismissCriticalAlert,
        acknowledgeInsight,
        refreshDashboard,
        isPaused,
        setIsPaused,
        activeScenario,
        setActiveScenario,
        isSimulating,
        startStreamSimulator,
        stopStreamSimulator,
        toggleStreamSimulator,
        isSimulatedOffline,
        setIsSimulatedOffline,
        reconnectWebSocket,
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
