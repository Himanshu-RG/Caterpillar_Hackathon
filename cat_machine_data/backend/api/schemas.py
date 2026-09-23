"""Pydantic schemas for request and response validation."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FleetSummaryResponse(BaseModel):
    total_machines: int
    operating: int
    idle: int
    maintenance: int
    machines_at_risk: int
    active_safety_alerts: int
    fleet_utilization: float = Field(..., description="Percentage of fleet operating")
    average_idle_percentage: float = Field(..., description="Fleet-wide idle ratio")


class MachineResponse(BaseModel):
    machine_id: str
    machine_model: str
    serial_number: str
    machine_age_years: float
    commission_date: str
    machine_type: str
    site_id: str


class MachineCurrentStateResponse(BaseModel):
    machine_id: str
    last_timestamp: str
    operator_id: str
    machine_model: str
    machine_status: str
    engine_hours: float
    engine_rpm: float
    engine_load_pct: float
    coolant_temp_c: float
    oil_pressure_bar: float
    oil_temperature_c: float
    hydraulic_temp_c: float
    hydraulic_pressure_bar: float
    fuel_level_l: float
    fuel_rate_l_hr: float
    speed_kmh: float
    payload_tonnes: float
    seatbelt_status: bool
    proximity_alert: bool
    overspeed_alert: bool
    unsafe_operation: bool
    fault_code: str
    site_id: str
    latitude: float
    longitude: float
    updated_at: str


class DerivedHealthResponse(BaseModel):
    machine_id: str
    health_status: str = Field(..., description="NORMAL, ATTENTION, or CRITICAL")
    failure_probability: float
    trend: str = Field(..., description="STABLE, DEGRADING, or CRITICAL")
    prediction_horizon: str
    active_anomalies: List[str]
    recent_fault_code: str
    recommendations: List[str]


class TelemetryPacket(BaseModel):
    timestamp: str
    machine_id: str
    operator_id: str
    machine_model: Optional[str] = "336"
    engine_hours: float = 1000.0
    engine_rpm: float
    engine_load_pct: float
    coolant_temp_c: float
    oil_pressure_bar: float
    oil_temperature_c: Optional[float] = 90.0
    fuel_level_l: Optional[float] = 300.0
    fuel_consumed_l: Optional[float] = 1000.0
    fuel_rate_l_hr: Optional[float] = 4.0
    idle_time_min: Optional[float] = 0.0
    operating_time_min: Optional[float] = 5.0
    speed_kmh: Optional[float] = 0.0
    distance_km: Optional[float] = 0.0
    cycle_count: Optional[int] = 0
    cycle_time_sec: Optional[float] = 0.0
    payload_tonnes: Optional[float] = 0.0
    bucket_load_tonnes: Optional[float] = 0.0
    load_count: Optional[int] = 0
    hydraulic_pressure_bar: float
    hydraulic_temp_c: float
    transmission_temp_c: Optional[float] = 60.0
    battery_voltage_v: Optional[float] = 27.5
    seatbelt_status: Optional[bool] = True
    proximity_alert: Optional[bool] = False
    overspeed_alert: Optional[bool] = False
    unsafe_operation: Optional[bool] = False
    fault_code: Optional[str] = "NONE"
    machine_status: str
    site_id: Optional[str] = "SITE_QUARRY_NORTH"
    latitude: Optional[float] = 41.52
    longitude: Optional[float] = -88.08


class FailurePredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    machine_id: str
    failure_probability: float
    risk_level: str
    prediction_horizon: str
    model_version: str
    timestamp: str
    top_contributing_signals: List[str]


class SafetyPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    machine_id: str
    unsafe_probability: float
    risk_level: str
    prediction_horizon: str
    model_version: str
    timestamp: str


class TaskPredictionRequest(BaseModel):
    task_type: str
    machine_id: str
    operator_id: str
    planned_quantity_tonnes: float
    estimated_time_min: float
    weather: Optional[str] = "Sunny"
    operator_skill: Optional[str] = "Intermediate"
    machine_age_years: Optional[float] = 3.0
    current_elapsed_min: Optional[float] = 0.0
    completed_tonnes: Optional[float] = 0.0


class TaskPredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    predicted_total_duration_min: float
    current_elapsed_min: float
    estimated_remaining_min: float
    target_unit: str
    model_version: str
    factors: List[str]


class SafetyAlertResponse(BaseModel):
    event_id: str
    event_start: str
    event_end: str
    duration_min: float
    machine_id: str
    operator_id: str
    event_type: str
    event_severity: str


class InsightResponse(BaseModel):
    insight_id: str
    timestamp: str
    machine_id: str
    operator_id: Optional[str]
    type: str
    severity: str
    title: str
    message: str
    recommended_action: str
    source: str
    risk: Optional[float]
    status: str


class OperatorResponse(BaseModel):
    operator_id: str
    operator_skill: str
    years_experience: float
    training_level: str
    certification_status: str
    historical_safety_score: float


class TaskResponse(BaseModel):
    task_id: str
    task_type: str
    machine_id: str
    operator_id: str
    planned_quantity_tonnes: float
    actual_quantity_tonnes: float
    estimated_time_min: float
    actual_time_min: float
    actual_start_time: str
    actual_end_time: str


class MachineDashboardResponse(BaseModel):
    machine: MachineResponse
    current_state: MachineCurrentStateResponse
    health: DerivedHealthResponse
    failure_prediction: Optional[FailurePredictionResponse]
    safety_alerts: List[SafetyAlertResponse]
    active_task: Optional[TaskResponse]
    recent_insights: List[InsightResponse]


class IncidentResponse(BaseModel):
    incident_id: str
    timestamp: str
    machine_id: str
    operator_id: str
    incident_type: str
    severity: str
    description: str


class CreateIncidentRequest(BaseModel):
    machine_id: str
    operator_id: Optional[str] = "OP001"
    incident_type: str
    severity: str
    description: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    machine_id: str
    message: str


class ChatResponse(BaseModel):
    machine_id: str
    reply: str
    timestamp: str
    context_signals: List[str]
    suggested_actions: List[str]
