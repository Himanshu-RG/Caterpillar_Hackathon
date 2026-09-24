/**
 * Strict TypeScript models matching backend FastAPI/Pydantic contracts.
 */

export interface Machine {
  machine_id: string;
  machine_model: string;
  serial_number: string;
  machine_age_years: number;
  commission_date: string;
  machine_type: string;
  site_id: string;
}

export interface MachineCurrentState {
  machine_id: string;
  last_timestamp: string;
  operator_id: string;
  machine_model: string;
  machine_status: string;
  engine_hours: number;
  engine_rpm: number;
  engine_load_pct: number;
  coolant_temp_c: number;
  oil_pressure_bar: number;
  oil_temperature_c: number;
  hydraulic_temp_c: number;
  hydraulic_pressure_bar: number;
  fuel_level_l: number;
  fuel_rate_l_hr: number;
  speed_kmh: number;
  payload_tonnes: number;
  seatbelt_status: boolean;
  proximity_alert: boolean;
  overspeed_alert: boolean;
  unsafe_operation: boolean;
  fault_code: string;
  site_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export interface DerivedHealth {
  machine_id: string;
  health_status: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  failure_probability: number;
  trend: 'STABLE' | 'DEGRADING' | 'CRITICAL';
  prediction_horizon: string;
  active_anomalies: string[];
  recent_fault_code: string;
  recommendations: string[];
}

export interface FailurePrediction {
  machine_id: string;
  failure_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction_horizon: string;
  model_version: string;
  timestamp: string;
  top_contributing_signals: string[];
}

export interface SafetyPrediction {
  machine_id: string;
  unsafe_probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  prediction_horizon: string;
  model_version: string;
  timestamp: string;
}

export interface TaskPrediction {
  predicted_total_duration_min: number;
  current_elapsed_min: number;
  estimated_remaining_min: number;
  target_unit: string;
  model_version: string;
  factors: string[];
}

export interface SafetyAlert {
  event_id: string;
  event_start: string;
  event_end: string;
  duration_min: number;
  machine_id: string;
  operator_id: string;
  event_type: string;
  event_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Insight {
  insight_id: string;
  timestamp: string;
  machine_id: string;
  operator_id?: string | null;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  message: string;
  recommended_action: string;
  source: string;
  risk?: number | null;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface Task {
  task_id: string;
  task_type: string;
  machine_id: string;
  operator_id: string;
  planned_quantity_tonnes: number;
  actual_quantity_tonnes: number;
  estimated_time_min: number;
  actual_time_min: number;
  actual_start_time: string;
  actual_end_time: string;
}

export interface Operator {
  operator_id: string;
  operator_skill: string;
  years_experience: number;
  training_level: string;
  certification_status: string;
  historical_safety_score: number;
}

export interface Incident {
  incident_id: string;
  timestamp: string;
  machine_id: string;
  operator_id: string;
  incident_type: string;
  severity: string;
  description: string;
}

export interface FleetSummary {
  total_machines: number;
  operating: number;
  idle: number;
  maintenance: number;
  machines_at_risk: number;
  active_safety_alerts: number;
  fleet_utilization: number;
  average_idle_percentage: number;
}

export interface MachineDashboard {
  machine: Machine;
  current_state: MachineCurrentState;
  health: DerivedHealth;
  failure_prediction: FailurePrediction | null;
  safety_alerts: SafetyAlert[];
  active_task: Task | null;
  recent_insights: Insight[];
}

export interface WebSocketTelemetryPayload {
  timestamp: string;
  machine_id: string;
  telemetry: {
    rpm?: number;
    load_pct?: number;
    coolant_temp?: number;
    oil_pressure?: number;
    hydraulic_temp?: number;
    hydraulic_pressure?: number;
    status?: string;
    fuel_rate?: number;
    speed_kmh?: number;
    payload_tonnes?: number;
    fault_code?: string;
  };
  safety: {
    seatbelt?: boolean;
    proximity?: boolean;
    overspeed?: boolean;
    violations_count?: number;
    violations?: Array<{ severity: string; title: string; message: string }>;
  };
  predictions: {
    failure_probability?: number;
    risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
    signals?: string[];
    unsafe_probability_30m?: number;
  };
  insights: any[];
}

export interface SimulatorScenario {
  id: string;
  name: string;
  machine_id: string;
  description: string;
  expected_behavior: string;
  is_active: boolean;
}

export interface ChatResponse {
  machine_id: string;
  reply: string;
  timestamp: string;
  context_signals: string[];
  suggested_actions: string[];
  urgency?: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  model_used?: string;
}

export interface AssistantStatus {
  gemini_active: boolean;
  gemini_configured?: boolean;
  active_model: string;
  supported_models: string[];
  telematics_integration: string;
  last_error?: string | null;
}
