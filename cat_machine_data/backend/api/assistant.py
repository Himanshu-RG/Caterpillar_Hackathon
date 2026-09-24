"""Context-aware AI operator companion chat endpoint powered by Gemini API and Caterpillar telematics."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import (
    MachineRepository,
    PredictionRepository,
    TaskRepository,
    SafetyRepository,
    InsightRepository,
)
from backend.api.schemas import ChatRequest, ChatResponse
from backend.intelligence.gemini_advisor import advisor, _extract_gemini_api_key

router = APIRouter(tags=["Assistant"])


@router.get("/api/assistant/status")
def get_assistant_status():
    """Check AI companion status and whether Gemini API is active."""
    api_key_configured = bool(_extract_gemini_api_key())
    return {
        "gemini_active": advisor.last_successful_model is not None,
        "gemini_configured": api_key_configured,
        "active_model": advisor.last_successful_model or advisor.default_model,
        "last_error": advisor.last_error,
        "supported_models": ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
        "telematics_integration": "LIVE_CANBUS_ML",
    }


@router.post("/api/assistant/chat", response_model=ChatResponse)
def operator_assistant_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Diagnose machine health and respond to operator queries using Gemini API + live CAN telematics."""
    m_repo = MachineRepository(db)
    machine = m_repo.get_by_id(req.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{req.machine_id}' not found")

    cur_state = m_repo.get_current_state(req.machine_id)
    p_repo = PredictionRepository(db)
    t_repo = TaskRepository(db)
    s_repo = SafetyRepository(db)
    i_repo = InsightRepository(db)

    latest_fail = p_repo.get_latest(req.machine_id, "FAILURE")
    active_task = t_repo.get_latest_task_for_machine(req.machine_id)
    recent_alerts = s_repo.get_events_for_machine(req.machine_id, limit=3)
    recent_insights = i_repo.get_for_machine(req.machine_id, status="ACTIVE", limit=3)

    # 1. Package Machine Model Catalog Data
    machine_meta = {
        "machine_id": machine.machine_id,
        "machine_model": machine.machine_model,
        "machine_type": machine.machine_type,
        "machine_age_years": machine.machine_age_years,
        "commission_date": machine.commission_date,
        "site_id": machine.site_id,
    }

    # 2. Package Current Live CAN-bus Telematics
    live_telemetry: Dict[str, Any] = {}
    if cur_state:
        live_telemetry = {
            "engine_rpm": cur_state.engine_rpm,
            "engine_load_pct": cur_state.engine_load_pct,
            "hydraulic_temp_c": cur_state.hydraulic_temp_c,
            "hydraulic_pressure_bar": cur_state.hydraulic_pressure_bar,
            "oil_pressure_bar": cur_state.oil_pressure_bar,
            "oil_temperature_c": getattr(cur_state, "oil_temperature_c", 90.0),
            "coolant_temp_c": cur_state.coolant_temp_c,
            "fuel_level_l": cur_state.fuel_level_l,
            "fuel_rate_l_hr": cur_state.fuel_rate_l_hr,
            "speed_kmh": cur_state.speed_kmh,
            "payload_tonnes": cur_state.payload_tonnes,
            "seatbelt_status": cur_state.seatbelt_status,
            "proximity_alert": cur_state.proximity_alert,
            "overspeed_alert": cur_state.overspeed_alert,
            "unsafe_operation": cur_state.unsafe_operation,
            "fault_code": cur_state.fault_code,
            "machine_status": cur_state.machine_status,
            "updated_at": cur_state.updated_at,
        }

    # 3. Package ML Predictive Analytics
    fail_dict: Optional[Dict[str, Any]] = None
    if latest_fail:
        fail_dict = {
            "probability": latest_fail.probability,
            "risk_level": latest_fail.risk_level,
            "signals": latest_fail.signals_json,
        }

    # 4. Package Active Work Order / Task
    task_dict: Optional[Dict[str, Any]] = None
    if active_task:
        task_dict = {
            "task_id": active_task.task_id,
            "task_type": active_task.task_type,
            "planned_quantity_tonnes": active_task.planned_quantity_tonnes,
            "actual_quantity_tonnes": active_task.actual_quantity_tonnes,
            "estimated_time_min": active_task.estimated_time_min,
            "actual_time_min": active_task.actual_time_min or 0.0,
            "cycle_count": active_task.cycle_count or 0,
            "average_cycle_time_sec": active_task.average_cycle_time_sec or 0.0,
        }

    # 5. Package Recent Safety Events
    events_list = [
        {
            "event_type": ev.event_type,
            "severity": ev.event_severity,
            "duration_min": ev.duration_min,
        }
        for ev in recent_alerts
    ]

    # 6. Package Active Intelligence Insights
    insights_list = [
        {
            "title": ins.title,
            "message": ins.message,
            "recommended_action": ins.recommended_action,
            "severity": ins.severity,
        }
        for ins in recent_insights
    ]

    # 7. Execute Diagnosis via Gemini API (with deterministic fallback)
    diagnosis = advisor.diagnose_and_respond(
        machine_meta=machine_meta,
        live_telemetry=live_telemetry,
        failure_prediction=fail_dict,
        active_task=task_dict,
        recent_safety_events=events_list,
        active_insights=insights_list,
        user_message=req.message,
        explicit_api_key=req.api_key,
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    return ChatResponse(
        machine_id=req.machine_id,
        reply=diagnosis["reply"],
        timestamp=now_iso,
        context_signals=diagnosis.get("context_signals", []),
        suggested_actions=diagnosis.get("suggested_actions", []),
        urgency=diagnosis.get("urgency", "NORMAL"),
        model_used=diagnosis.get("model_used"),
    )
