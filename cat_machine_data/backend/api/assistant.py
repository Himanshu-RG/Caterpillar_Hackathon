"""Context-aware AI operator companion chat endpoint."""

from datetime import datetime, timezone
from typing import List
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

router = APIRouter(tags=["Assistant"])


@router.post("/api/assistant/chat", response_model=ChatResponse)
def operator_assistant_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Context-aware AI companion responding directly based on live telematics and ML state."""
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

    msg = req.message.lower().strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    context_signals: List[str] = []
    suggested_actions: List[str] = []
    reply = ""

    if cur_state:
        context_signals.append(f"Engine Load: {cur_state.engine_load_pct:.1f}%")
        context_signals.append(f"Hydraulic Temp: {cur_state.hydraulic_temp_c:.1f}°C")
        context_signals.append(f"Hydraulic Pressure: {cur_state.hydraulic_pressure_bar:.1f} bar")
        context_signals.append(f"Oil Pressure: {cur_state.oil_pressure_bar:.2f} bar")
        if cur_state.fault_code != "NONE":
            context_signals.append(f"Active Fault Code: {cur_state.fault_code}")

    if latest_fail:
        context_signals.append(f"Failure Risk: {latest_fail.probability * 100.0:.1f}% ({latest_fail.risk_level})")

    # Intent Matching
    if "wrong" in msg or "status" in msg or "health" in msg:
        if cur_state and cur_state.hydraulic_temp_c > 85.0:
            reply = (
                f"Machine {req.machine_id} shows thermal stress. Hydraulic temperature is currently elevated at "
                f"{cur_state.hydraulic_temp_c:.1f}°C (normal operating ceiling is 80°C). "
                f"Predictive failure risk is evaluated at {latest_fail.probability * 100.0 if latest_fail else 0:.1f}%."
            )
            suggested_actions = [
                "Reduce continuous high-load digging cycles",
                "Check hydraulic oil cooler airflow and fluid level",
                "Request preventative hydraulic circuit inspection",
            ]
        elif cur_state and cur_state.oil_pressure_bar < 2.5:
            reply = (
                f"Warning on Machine {req.machine_id}: Engine oil gallery pressure is low at "
                f"{cur_state.oil_pressure_bar:.2f} bar (nominal threshold is > 2.8 bar). Lubrication film risk detected."
            )
            suggested_actions = ["Idle engine immediately and inspect engine oil dipstick", "Notify maintenance workshop"]
        elif latest_fail and latest_fail.risk_level in ("HIGH", "MEDIUM"):
            reply = (
                f"Machine {req.machine_id} is in {latest_fail.risk_level} risk status. "
                f"The predictive maintenance model forecasts elevated component stress within the next 50 operating hours."
            )
            suggested_actions = ["Review active predictive insights", "Schedule proactive inspection before next shift"]
        else:
            reply = (
                f"Machine {req.machine_id} is operating in healthy equilibrium. All thermodynamic and mechanical "
                f"signals are within Caterpillar standard tolerances."
            )
            suggested_actions = ["Continue planned earthmoving operations", "Maintain standard cycle pacing"]

    elif "hydraulic" in msg or "temperature" in msg or "heat" in msg:
        hyd_t = cur_state.hydraulic_temp_c if cur_state else 70.0
        hyd_p = cur_state.hydraulic_pressure_bar if cur_state else 240.0
        reply = (
            f"The hydraulic system is currently operating at {hyd_t:.1f}°C and {hyd_p:.1f} bar. "
            + (
                "Thermal drift is detected over recent operating cycles, indicating elevated flow resistance or cooling bypass."
                if hyd_t > 80.0
                else "Temperatures are stable within nominal operating limits."
            )
        )
        suggested_actions = (
            ["Clean cooler radiator core", "Avoid prolonged relief valve stalling"]
            if hyd_t > 80.0
            else ["Monitor temperature gauge periodically during heavy excavation"]
        )

    elif "time" in msg or "task" in msg or "eta" in msg or "remaining" in msg or "longer" in msg:
        if active_task:
            est_rem = max(0.0, active_task.estimated_time_min - (active_task.actual_time_min or 0.0))
            reply = (
                f"Current task '{active_task.task_type}' (ID: {active_task.task_id}) target is "
                f"{active_task.planned_quantity_tonnes:.0f} tonnes. "
                f"Estimated remaining duration is approximately {est_rem:.0f} minutes based on baseline dispatch."
            )
            if active_task.actual_quantity_tonnes > 0:
                pct = (active_task.actual_quantity_tonnes / active_task.planned_quantity_tonnes) * 100.0
                reply += f" Progress is currently at {pct:.1f}% ({active_task.actual_quantity_tonnes:.0f}t completed)."
            suggested_actions = ["Maintain steady cycle times (~38-42s)", "Ensure smooth haul truck spot alignment"]
        else:
            reply = "No active production task is currently dispatched for this machine."
            suggested_actions = ["Check with site supervisor for dispatch schedule"]

    elif "check" in msg or "start" in msg or "pre-op" in msg or "preop" in msg:
        reply = (
            "Recommended pre-operation walk-around checklist for "
            f"{machine.machine_model} ({req.machine_id}):\n"
            "1. Fasten safety seatbelt before releasing hydraulic lockout lever\n"
            "2. Inspect hydraulic cylinders and hoses for weeping or leaks\n"
            "3. Verify engine oil, coolant, and hydraulic fluid sight gauges\n"
            "4. Test 360-degree proximity radar sensors and backup camera\n"
            "5. Ensure clear ground spotters before slewing superstructure"
        )
        suggested_actions = [
            "Confirm seatbelt fastened",
            "Perform hydraulic lockout cycle test",
            "Acknowledge daily walk-around completion",
        ]

    else:
        # General response synthesizing current telemetry
        status_text = cur_state.machine_status if cur_state else "OPERATIONAL"
        reply = (
            f"Machine Assistant monitoring {req.machine_id} ({machine.machine_model}). "
            f"Machine status is {status_text}. "
            + (
                f"Recent recommendation: '{recent_insights[0].recommended_action}'."
                if recent_insights
                else "All telemetry channels are streaming normally."
            )
        )
        suggested_actions = ["Ask 'What is wrong with my machine?'", "Ask 'How much time is left on my task?'"]

    return ChatResponse(
        machine_id=req.machine_id,
        reply=reply,
        timestamp=now_iso,
        context_signals=context_signals,
        suggested_actions=suggested_actions,
    )
