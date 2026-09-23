"""Machine registry, fleet summary, derived health, and dashboard endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import (
    MachineRepository,
    TelemetryRepository,
    TaskRepository,
    SafetyRepository,
    PredictionRepository,
    InsightRepository,
)
from backend.api.schemas import (
    FleetSummaryResponse,
    MachineResponse,
    MachineCurrentStateResponse,
    DerivedHealthResponse,
    MachineDashboardResponse,
    FailurePredictionResponse,
    SafetyAlertResponse,
    TaskResponse,
    InsightResponse,
)
from backend.features.realtime_features import RealtimeFeatureEngine, FeatureBufferManager
from backend.inference.failure_predictor import FailurePredictor
from backend.rules.machine_rules import MachineRuleEngine

router = APIRouter(tags=["Machines & Fleet"])

# Shared in-memory feature & inference singletons
_feature_mgr = FeatureBufferManager()
_feature_engine = RealtimeFeatureEngine(buffer_manager=_feature_mgr)
_failure_pred = FailurePredictor()
_machine_rules = MachineRuleEngine()


@router.get("/api/fleet/summary", response_model=FleetSummaryResponse)
def get_fleet_summary(db: Session = Depends(get_db)):
    repo = MachineRepository(db)
    return repo.get_fleet_summary()


@router.get("/api/machines", response_model=List[MachineResponse])
def list_machines(db: Session = Depends(get_db)):
    repo = MachineRepository(db)
    return repo.get_all()


@router.get("/api/machines/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    repo = MachineRepository(db)
    m = repo.get_by_id(machine_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")
    return m


@router.get("/api/machines/{machine_id}/health", response_model=DerivedHealthResponse)
def get_derived_machine_health(machine_id: str, db: Session = Depends(get_db)):
    """Presentation-level derived health status without exposing hidden health_score."""
    m_repo = MachineRepository(db)
    t_repo = TelemetryRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    latest_records = t_repo.get_latest_for_machine(machine_id, limit=12)
    if not latest_records:
        return DerivedHealthResponse(
            machine_id=machine_id,
            health_status="NORMAL",
            failure_probability=0.05,
            trend="STABLE",
            prediction_horizon="50 operating hours",
            active_anomalies=[],
            recent_fault_code="NONE",
            recommendations=["Continue routine visual inspections."],
        )

    latest = latest_records[-1]
    # Build packet dict
    packet = {
        "timestamp": latest.timestamp,
        "machine_id": latest.machine_id,
        "operator_id": latest.operator_id,
        "engine_hours": latest.engine_hours,
        "engine_rpm": latest.engine_rpm,
        "engine_load_pct": latest.engine_load_pct,
        "coolant_temp_c": latest.coolant_temp_c,
        "oil_pressure_bar": latest.oil_pressure_bar,
        "oil_temperature_c": latest.oil_temperature_c,
        "hydraulic_pressure_bar": latest.hydraulic_pressure_bar,
        "hydraulic_temp_c": latest.hydraulic_temp_c,
        "fuel_rate_l_hr": latest.fuel_rate_l_hr,
        "speed_kmh": latest.speed_kmh,
        "payload_tonnes": latest.payload_tonnes,
        "cycle_time_sec": latest.cycle_time_sec,
        "idle_time_min": latest.idle_time_min,
        "operating_time_min": latest.operating_time_min,
        "fault_code": latest.fault_code,
    }

    metrics = _feature_engine.update_and_compute_metrics(packet, machine=machine)
    f_df = _feature_engine.build_failure_feature_vector(metrics)
    f_pred = _failure_pred.predict(machine_id, f_df, timestamp=latest.timestamp)
    anomalies = _machine_rules.evaluate(metrics)

    prob = f_pred["failure_probability"]
    if prob >= 0.65 or latest.fault_code != "NONE":
        health_status = "CRITICAL"
        trend = "CRITICAL"
    elif prob >= 0.35 or len(anomalies) > 0:
        health_status = "ATTENTION"
        trend = "DEGRADING"
    else:
        health_status = "NORMAL"
        trend = "STABLE"

    recs = []
    if health_status == "CRITICAL":
        recs.append("Priority workshop diagnostic overhaul recommended.")
    elif health_status == "ATTENTION":
        recs.append("Schedule proactive hydraulic and lubrication circuit check next shift.")
    else:
        recs.append("Operating cleanly within manufacturer tolerances.")

    return DerivedHealthResponse(
        machine_id=machine_id,
        health_status=health_status,
        failure_probability=prob,
        trend=trend,
        prediction_horizon="50 operating hours",
        active_anomalies=[f"{a.title}: {a.message}" for a in anomalies],
        recent_fault_code=latest.fault_code,
        recommendations=recs,
    )


@router.get("/api/machines/{machine_id}/dashboard", response_model=MachineDashboardResponse)
def get_machine_dashboard(machine_id: str, db: Session = Depends(get_db)):
    """Consolidated endpoint delivering entire machine context for instant dashboard loading."""
    m_repo = MachineRepository(db)
    t_repo = TaskRepository(db)
    s_repo = SafetyRepository(db)
    p_repo = PredictionRepository(db)
    i_repo = InsightRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    cur_state = m_repo.get_current_state(machine_id)
    if not cur_state:
        raise HTTPException(status_code=404, detail=f"No telematics state found for '{machine_id}'")

    health = get_derived_machine_health(machine_id, db=db)

    # Latest failure prediction
    latest_pred = p_repo.get_latest(machine_id, "FAILURE")
    failure_pred_resp = None
    if latest_pred:
        import json
        signals = json.loads(latest_pred.signals_json) if latest_pred.signals_json else []
        failure_pred_resp = FailurePredictionResponse(
            machine_id=machine_id,
            failure_probability=latest_pred.probability or 0.0,
            risk_level=latest_pred.risk_level or "LOW",
            prediction_horizon="50 operating hours",
            model_version=latest_pred.model_version,
            timestamp=latest_pred.timestamp,
            top_contributing_signals=signals,
        )

    # Active task
    active_task = t_repo.get_active_task_for_machine(machine_id, cur_state.last_timestamp)
    if not active_task:
        active_task = t_repo.get_latest_task_for_machine(machine_id)

    task_resp = None
    if active_task:
        task_resp = TaskResponse(
            task_id=active_task.task_id,
            task_type=active_task.task_type,
            machine_id=active_task.machine_id,
            operator_id=active_task.operator_id,
            planned_quantity_tonnes=active_task.planned_quantity_tonnes,
            actual_quantity_tonnes=active_task.actual_quantity_tonnes,
            estimated_time_min=active_task.estimated_time_min,
            actual_time_min=active_task.actual_time_min,
            actual_start_time=active_task.actual_start_time,
            actual_end_time=active_task.actual_end_time,
        )

    # Safety alerts
    safety_events = s_repo.get_events_for_machine(machine_id, limit=5)
    alerts = [
        SafetyAlertResponse(
            event_id=ev.event_id,
            event_start=ev.event_start,
            event_end=ev.event_end,
            duration_min=ev.duration_min,
            machine_id=ev.machine_id,
            operator_id=ev.operator_id,
            event_type=ev.event_type,
            event_severity=ev.event_severity,
        )
        for ev in safety_events
    ]

    # Recent insights
    insights = i_repo.get_for_machine(machine_id, limit=5)
    insights_resp = [
        InsightResponse(
            insight_id=ins.insight_id,
            timestamp=ins.timestamp,
            machine_id=ins.machine_id,
            operator_id=ins.operator_id,
            type=ins.type,
            severity=ins.severity,
            title=ins.title,
            message=ins.message,
            recommended_action=ins.recommended_action,
            source=ins.source,
            risk=ins.risk,
            status=ins.status,
        )
        for ins in insights
    ]

    return MachineDashboardResponse(
        machine=MachineResponse(
            machine_id=machine.machine_id,
            machine_model=machine.machine_model,
            serial_number=machine.serial_number,
            machine_age_years=machine.machine_age_years,
            commission_date=machine.commission_date,
            machine_type=machine.machine_type,
            site_id=machine.site_id,
        ),
        current_state=MachineCurrentStateResponse(
            machine_id=cur_state.machine_id,
            last_timestamp=cur_state.last_timestamp,
            operator_id=cur_state.operator_id,
            machine_model=cur_state.machine_model,
            machine_status=cur_state.machine_status,
            engine_hours=cur_state.engine_hours,
            engine_rpm=cur_state.engine_rpm,
            engine_load_pct=cur_state.engine_load_pct,
            coolant_temp_c=cur_state.coolant_temp_c,
            oil_pressure_bar=cur_state.oil_pressure_bar,
            oil_temperature_c=cur_state.oil_temperature_c,
            hydraulic_temp_c=cur_state.hydraulic_temp_c,
            hydraulic_pressure_bar=cur_state.hydraulic_pressure_bar,
            fuel_level_l=cur_state.fuel_level_l,
            fuel_rate_l_hr=cur_state.fuel_rate_l_hr,
            speed_kmh=cur_state.speed_kmh,
            payload_tonnes=cur_state.payload_tonnes,
            seatbelt_status=cur_state.seatbelt_status,
            proximity_alert=cur_state.proximity_alert,
            overspeed_alert=cur_state.overspeed_alert,
            unsafe_operation=cur_state.unsafe_operation,
            fault_code=cur_state.fault_code,
            site_id=cur_state.site_id,
            latitude=cur_state.latitude,
            longitude=cur_state.longitude,
            updated_at=cur_state.updated_at,
        ),
        health=health,
        failure_prediction=failure_pred_resp,
        safety_alerts=alerts,
        active_task=task_resp,
        recent_insights=insights_resp,
    )
