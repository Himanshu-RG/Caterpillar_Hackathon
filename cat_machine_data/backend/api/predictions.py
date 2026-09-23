"""Prediction endpoints for failure, safety risk, and task duration."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import (
    MachineRepository,
    TelemetryRepository,
    OperatorRepository,
    PredictionRepository,
)
from backend.api.schemas import (
    FailurePredictionResponse,
    SafetyPredictionResponse,
    TaskPredictionRequest,
    TaskPredictionResponse,
)
from backend.features.realtime_features import RealtimeFeatureEngine, FeatureBufferManager
from backend.inference.failure_predictor import FailurePredictor
from backend.inference.safety_predictor import SafetyPredictor
from backend.inference.task_predictor import TaskPredictor

router = APIRouter(tags=["Predictions"])

_feature_mgr = FeatureBufferManager()
_feature_engine = RealtimeFeatureEngine(buffer_manager=_feature_mgr)
_failure_pred = FailurePredictor()
_safety_pred = SafetyPredictor()
_task_pred = TaskPredictor()


@router.post("/api/predictions/failure/{machine_id}", response_model=FailurePredictionResponse)
def predict_machine_failure(machine_id: str, db: Session = Depends(get_db)):
    """Run failure prediction model on the machine's latest telemetry window."""
    m_repo = MachineRepository(db)
    t_repo = TelemetryRepository(db)
    p_repo = PredictionRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    cur_state = m_repo.get_current_state(machine_id)
    if not cur_state:
        raise HTTPException(status_code=404, detail=f"No telematics data available for '{machine_id}'")

    packet = {
        "timestamp": cur_state.last_timestamp,
        "machine_id": machine_id,
        "operator_id": cur_state.operator_id,
        "engine_hours": cur_state.engine_hours,
        "engine_rpm": cur_state.engine_rpm,
        "engine_load_pct": cur_state.engine_load_pct,
        "coolant_temp_c": cur_state.coolant_temp_c,
        "oil_pressure_bar": cur_state.oil_pressure_bar,
        "oil_temperature_c": cur_state.oil_temperature_c,
        "hydraulic_pressure_bar": cur_state.hydraulic_pressure_bar,
        "hydraulic_temp_c": cur_state.hydraulic_temp_c,
        "fuel_rate_l_hr": cur_state.fuel_rate_l_hr,
        "speed_kmh": cur_state.speed_kmh,
        "payload_tonnes": cur_state.payload_tonnes,
    }

    metrics = _feature_engine.update_and_compute_metrics(packet, machine=machine)
    f_df = _feature_engine.build_failure_feature_vector(metrics)
    f_res = _failure_pred.predict(machine_id, f_df, timestamp=cur_state.last_timestamp)

    # Log to prediction history
    p_repo.log_prediction(
        machine_id=machine_id,
        prediction_type="FAILURE",
        probability=f_res["failure_probability"],
        risk_level=f_res["risk_level"],
        signals=f_res["top_contributing_signals"],
        timestamp=cur_state.last_timestamp,
    )

    return FailurePredictionResponse(
        machine_id=machine_id,
        failure_probability=f_res["failure_probability"],
        risk_level=f_res["risk_level"],
        prediction_horizon=f_res["prediction_horizon"],
        model_version=f_res["model_version"],
        timestamp=f_res["timestamp"],
        top_contributing_signals=f_res["top_contributing_signals"],
    )


@router.post("/api/predictions/safety/{machine_id}", response_model=SafetyPredictionResponse)
def predict_safety_risk(machine_id: str, db: Session = Depends(get_db)):
    """Run safety prediction model evaluating risk in next 30 minutes."""
    m_repo = MachineRepository(db)
    op_repo = OperatorRepository(db)
    p_repo = PredictionRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    cur_state = m_repo.get_current_state(machine_id)
    if not cur_state:
        raise HTTPException(status_code=404, detail=f"No telematics data available for '{machine_id}'")

    operator = op_repo.get_by_id(cur_state.operator_id)
    packet = {
        "timestamp": cur_state.last_timestamp,
        "machine_id": machine_id,
        "operator_id": cur_state.operator_id,
        "speed_kmh": cur_state.speed_kmh,
        "engine_load_pct": cur_state.engine_load_pct,
        "payload_tonnes": cur_state.payload_tonnes,
    }

    metrics = _feature_engine.update_and_compute_metrics(packet, machine=machine, operator=operator)
    s_df = _feature_engine.build_safety_feature_vector(metrics)
    s_res = _safety_pred.predict(machine_id, s_df, timestamp=cur_state.last_timestamp)

    p_repo.log_prediction(
        machine_id=machine_id,
        prediction_type="SAFETY",
        probability=s_res["unsafe_probability"],
        risk_level=s_res["risk_level"],
        timestamp=cur_state.last_timestamp,
    )

    return SafetyPredictionResponse(
        machine_id=machine_id,
        unsafe_probability=s_res["unsafe_probability"],
        risk_level=s_res["risk_level"],
        prediction_horizon=s_res["prediction_horizon"],
        model_version=s_res["model_version"],
        timestamp=s_res["timestamp"],
    )


@router.post("/api/predictions/task-time", response_model=TaskPredictionResponse)
def predict_task_duration(req: TaskPredictionRequest, db: Session = Depends(get_db)):
    """Predict task duration and dynamic remaining ETA based on dispatch features."""
    m_repo = MachineRepository(db)
    machine = m_repo.get_by_id(req.machine_id)
    machine_age = machine.machine_age_years if machine else (req.machine_age_years or 3.0)

    t_df = _feature_engine.build_task_feature_vector(
        task_type=req.task_type,
        planned_quantity_tonnes=req.planned_quantity_tonnes,
        estimated_time_min=req.estimated_time_min,
        machine_age_years=machine_age,
        weather=req.weather or "Sunny",
        operator_skill=req.operator_skill or "Intermediate",
    )

    t_res = _task_pred.predict(
        feature_df=t_df,
        current_elapsed_min=req.current_elapsed_min or 0.0,
        completed_tonnes=req.completed_tonnes or 0.0,
    )

    return TaskPredictionResponse(
        predicted_total_duration_min=t_res["predicted_total_duration_min"],
        current_elapsed_min=t_res["current_elapsed_min"],
        estimated_remaining_min=t_res["estimated_remaining_min"],
        target_unit=t_res["target_unit"],
        model_version=t_res["model_version"],
        factors=t_res["factors"],
    )


@router.get("/api/predictions/{machine_id}/history")
def get_prediction_history(machine_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve historical risk predictions for trend graphing."""
    p_repo = PredictionRepository(db)
    history = p_repo.get_history(machine_id, limit=limit)
    return [
        {
            "timestamp": h.timestamp,
            "prediction_type": h.prediction_type,
            "probability": h.probability,
            "predicted_value": h.predicted_value,
            "risk_level": h.risk_level,
            "model_version": h.model_version,
        }
        for h in history
    ]
