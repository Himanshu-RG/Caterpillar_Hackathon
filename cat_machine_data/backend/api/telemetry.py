"""Telemetry stream and ingestion endpoints."""

import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import (
    TelemetryRepository,
    MachineRepository,
    OperatorRepository,
    PredictionRepository,
    InsightRepository,
)
from backend.data_hub.ingestion import TelemetryIngestionService
from backend.api.schemas import TelemetryPacket
from backend.api.websocket import manager
from backend.features.realtime_features import RealtimeFeatureEngine, FeatureBufferManager
from backend.rules.safety_rules import SafetyRuleEngine
from backend.rules.machine_rules import MachineRuleEngine
from backend.inference.failure_predictor import FailurePredictor
from backend.inference.safety_predictor import SafetyPredictor
from backend.intelligence.insight_engine import InsightEngine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Telemetry"])

# Reusable singletons
_feature_mgr = FeatureBufferManager()
_feature_engine = RealtimeFeatureEngine(buffer_manager=_feature_mgr)
_safety_rules = SafetyRuleEngine()
_machine_rules = MachineRuleEngine()
_failure_pred = FailurePredictor()
_safety_pred = SafetyPredictor()
_insight_engine = InsightEngine()


@router.get("/api/machines/{machine_id}/telemetry")
def get_machine_telemetry(machine_id: str, limit: int = 24, db: Session = Depends(get_db)):
    """Retrieve recent historical telemetry observations for charting trends."""
    t_repo = TelemetryRepository(db)
    records = t_repo.get_latest_for_machine(machine_id, limit=limit)
    return [
        {
            "timestamp": r.timestamp,
            "machine_id": r.machine_id,
            "engine_hours": r.engine_hours,
            "engine_rpm": r.engine_rpm,
            "engine_load_pct": r.engine_load_pct,
            "coolant_temp_c": r.coolant_temp_c,
            "oil_pressure_bar": r.oil_pressure_bar,
            "hydraulic_temp_c": r.hydraulic_temp_c,
            "hydraulic_pressure_bar": r.hydraulic_pressure_bar,
            "fuel_rate_l_hr": r.fuel_rate_l_hr,
            "speed_kmh": r.speed_kmh,
            "payload_tonnes": r.payload_tonnes,
            "idle_time_min": r.idle_time_min,
            "operating_time_min": r.operating_time_min,
            "machine_status": r.machine_status,
        }
        for r in records
    ]


@router.post("/api/telemetry/ingest")
async def ingest_telemetry_packet(packet: TelemetryPacket, db: Session = Depends(get_db)):
    """Ingest a live or simulated telemetry packet and trigger streaming analytics."""
    packet_dict = packet.model_dump()
    machine_id = packet.machine_id

    # 1. Ingestion
    ingestion = TelemetryIngestionService(db)
    valid, record, err = ingestion.ingest_packet(packet_dict, allow_replay=True)
    if not valid:
        raise HTTPException(status_code=400, detail=err)

    # 2. Context retrieval
    m_repo = MachineRepository(db)
    op_repo = OperatorRepository(db)
    pred_repo = PredictionRepository(db)
    ins_repo = InsightRepository(db)

    machine = m_repo.get_by_id(machine_id)
    operator = op_repo.get_by_id(packet.operator_id)

    # 3. Real-time Feature Engine
    metrics = _feature_engine.update_and_compute_metrics(packet_dict, machine=machine, operator=operator)
    failure_df = _feature_engine.build_failure_feature_vector(metrics)
    safety_df = _feature_engine.build_safety_feature_vector(metrics)

    # 4. Rules & ML Inference
    safety_violations = _safety_rules.evaluate(packet_dict, machine_type=machine.machine_type if machine else "Hydraulic Excavator")
    machine_anomalies = _machine_rules.evaluate(metrics)

    f_res = _failure_pred.predict(machine_id, failure_df, timestamp=packet.timestamp)
    s_res = _safety_pred.predict(machine_id, safety_df, timestamp=packet.timestamp)

    # Log failure prediction to history
    pred_repo.log_prediction(
        machine_id=machine_id,
        prediction_type="FAILURE",
        probability=f_res["failure_probability"],
        risk_level=f_res["risk_level"],
        signals=f_res["top_contributing_signals"],
        timestamp=packet.timestamp,
    )

    # 5. Intelligence / Insight Engine
    insights = _insight_engine.generate_insights(
        machine_id=machine_id,
        current_telemetry=packet_dict,
        computed_metrics=metrics,
        safety_violations=safety_violations,
        machine_anomalies=machine_anomalies,
        failure_prediction=f_res,
        safety_prediction=s_res,
        timestamp=packet.timestamp,
    )

    saved_insights = []
    for ins in insights:
        saved = ins_repo.create_or_update(
            insight_id=ins.insight_id,
            machine_id=ins.machine_id,
            insight_type=ins.type,
            severity=ins.severity,
            title=ins.title,
            message=ins.message,
            recommended_action=ins.recommended_action,
            source=ins.source,
            risk=ins.risk,
            operator_id=ins.operator_id,
            timestamp=ins.timestamp,
        )
        saved_insights.append({
            "insight_id": saved.insight_id,
            "type": saved.type,
            "severity": saved.severity,
            "title": saved.title,
            "message": saved.message,
            "recommended_action": saved.recommended_action,
            "status": saved.status,
        })

    # 6. Real-time WebSocket Broadcast
    broadcast_payload = {
        "timestamp": packet.timestamp,
        "machine_id": machine_id,
        "telemetry": {
            "rpm": packet.engine_rpm,
            "load_pct": packet.engine_load_pct,
            "coolant_temp": packet.coolant_temp_c,
            "oil_pressure": packet.oil_pressure_bar,
            "hydraulic_temp": packet.hydraulic_temp_c,
            "hydraulic_pressure": packet.hydraulic_pressure_bar,
            "status": packet.machine_status,
            "fuel_rate": packet.fuel_rate_l_hr,
        },
        "safety": {
            "seatbelt": packet.seatbelt_status,
            "proximity": packet.proximity_alert,
            "overspeed": packet.overspeed_alert,
            "violations_count": len(safety_violations),
            "violations": [{"severity": v.severity, "title": v.title, "message": v.message} for v in safety_violations],
        },
        "predictions": {
            "failure_probability": f_res["failure_probability"],
            "risk_level": f_res["risk_level"],
            "signals": f_res["top_contributing_signals"],
            "unsafe_probability_30m": s_res["unsafe_probability"],
        },
        "insights": saved_insights,
    }
    await manager.broadcast_machine_update(machine_id, broadcast_payload)

    return {
        "status": "ingested",
        "machine_id": machine_id,
        "timestamp": packet.timestamp,
        "failure_prediction": f_res,
        "active_insights": len(saved_insights),
        "safety_alerts": len(safety_violations),
    }
