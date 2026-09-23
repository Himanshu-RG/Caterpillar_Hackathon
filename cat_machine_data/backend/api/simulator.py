"""Simulator management endpoints for live demonstration control."""

import threading
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.simulator.scenario_controller import DEMO_SCENARIOS, ScenarioController
from backend.simulator.telemetry_simulator import TelemetrySimulator
from backend.data_hub.database import SessionLocal
from backend.data_hub.ingestion import TelemetryIngestionService
from backend.features.realtime_features import RealtimeFeatureEngine, FeatureBufferManager
from backend.rules.safety_rules import SafetyRuleEngine
from backend.rules.machine_rules import MachineRuleEngine
from backend.inference.failure_predictor import FailurePredictor
from backend.inference.safety_predictor import SafetyPredictor
from backend.intelligence.insight_engine import InsightEngine
from backend.data_hub.repositories import MachineRepository, OperatorRepository, PredictionRepository, InsightRepository
from backend.api.websocket import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Simulator"])


class StartSimulationRequest(BaseModel):
    scenario: str = "degrading"
    machine_id: Optional[str] = None
    speed: float = 2.0
    mode: str = "replay"
    limit: int = 120


class SimulatorState:
    def __init__(self):
        self.is_running = False
        self.current_scenario: Optional[str] = None
        self.current_machine: Optional[str] = None
        self.packets_sent = 0
        self.speed: float = 1.0
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None


_state = SimulatorState()


def _run_sim_worker(req: StartSimulationRequest, stop_event: threading.Event):
    logger.info("Simulator worker started for scenario: %s", req.scenario)
    scenario = ScenarioController.get_scenario(req.scenario)
    machine_id = req.machine_id or scenario.machine_id
    start_index = scenario.default_start_index
    limit = req.limit or scenario.default_limit

    sim = TelemetrySimulator(mode=req.mode, speed_factor=req.speed, base_interval_seconds=1.5)
    db = SessionLocal()
    feature_mgr = FeatureBufferManager()
    feature_mgr.preload_from_db(db, machine_id, limit=288)
    feature_engine = RealtimeFeatureEngine(buffer_manager=feature_mgr)
    safety_rules = SafetyRuleEngine()
    machine_rules = MachineRuleEngine()
    failure_pred = FailurePredictor()
    safety_pred = SafetyPredictor()
    insight_engine = InsightEngine()
    ingestion = TelemetryIngestionService(db)
    m_repo = MachineRepository(db)
    op_repo = OperatorRepository(db)
    pred_repo = PredictionRepository(db)
    ins_repo = InsightRepository(db)

    try:
        stream = sim.run_simulation(
            machine_id=machine_id,
            start_index=start_index,
            limit=limit,
            sleep_between_packets=True,
        )

        for packet in stream:
            if stop_event.is_set():
                logger.info("Simulator worker received stop event.")
                break

            # 1. Ingest
            valid, record, err = ingestion.ingest_packet(packet)
            if not valid:
                continue

            machine = m_repo.get_by_id(machine_id)
            operator = op_repo.get_by_id(packet.get("operator_id"))

            # 2. Features
            metrics = feature_engine.update_and_compute_metrics(packet, machine=machine, operator=operator)
            failure_df = feature_engine.build_failure_feature_vector(metrics)
            safety_df = feature_engine.build_safety_feature_vector(metrics)

            # 3. Rules
            safety_violations = safety_rules.evaluate(
                packet,
                machine_type=machine.machine_type if machine else "Hydraulic Excavator"
            )
            machine_anomalies = machine_rules.evaluate(metrics)

            # 4. Inference
            f_res = failure_pred.predict(machine_id, failure_df, timestamp=packet.get("timestamp"))
            s_res = safety_pred.predict(machine_id, safety_df, timestamp=packet.get("timestamp"))

            # Log prediction
            pred_repo.log_prediction(
                machine_id=machine_id,
                prediction_type="FAILURE",
                probability=f_res["failure_probability"],
                risk_level=f_res["risk_level"],
                signals=f_res["top_contributing_signals"],
                timestamp=packet.get("timestamp"),
            )

            # 5. Insights
            insights = insight_engine.generate_insights(
                machine_id=machine_id,
                current_telemetry=packet,
                computed_metrics=metrics,
                safety_violations=safety_violations,
                machine_anomalies=machine_anomalies,
                failure_prediction=f_res,
                safety_prediction=s_res,
                timestamp=packet.get("timestamp"),
            )

            saved_insights = []
            for ins in insights:
                rec = ins_repo.create_or_update(
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
                    "insight_id": rec.insight_id,
                    "title": rec.title,
                    "severity": rec.severity,
                    "recommended_action": rec.recommended_action,
                    "type": rec.type,
                    "status": rec.status,
                })

            # 6. Broadcast via WebSocket
            broadcast_payload = {
                "timestamp": packet.get("timestamp"),
                "machine_id": machine_id,
                "telemetry": {
                    "rpm": packet.get("engine_rpm"),
                    "load_pct": packet.get("engine_load_pct"),
                    "coolant_temp": packet.get("coolant_temp_c"),
                    "oil_pressure": packet.get("oil_pressure_bar"),
                    "hydraulic_temp": packet.get("hydraulic_temp_c"),
                    "hydraulic_pressure": packet.get("hydraulic_pressure_bar"),
                    "status": packet.get("machine_status"),
                    "fuel_rate": packet.get("fuel_rate_l_hr"),
                    "speed_kmh": packet.get("speed_kmh", 0.0),
                    "payload_tonnes": packet.get("payload_tonnes", 0.0),
                    "fault_code": packet.get("fault_code", "NONE"),
                },
                "safety": {
                    "seatbelt": packet.get("seatbelt_status", True),
                    "proximity": packet.get("proximity_alert", False),
                    "overspeed": packet.get("overspeed_alert", False),
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

            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        manager.broadcast_machine_update(machine_id, broadcast_payload),
                        loop
                    )
            except Exception:
                pass

            _state.packets_sent += 1

    except Exception as exc:
        logger.error("Simulator error: %s", exc, exc_info=True)
    finally:
        _state.is_running = False
        db.close()
        logger.info("Simulator worker stopped. Total packets: %d", _state.packets_sent)


@router.get("/api/simulator/scenarios")
def get_scenarios():
    """List available demo scenarios."""
    scenarios = []
    for key, sc in DEMO_SCENARIOS.items():
        scenarios.append({
            "id": key,
            "name": sc.name,
            "machine_id": sc.machine_id,
            "description": sc.description,
            "expected_behavior": sc.expected_behavior,
            "is_active": (_state.is_running and _state.current_scenario == key),
        })
    return {
        "scenarios": scenarios,
        "active_scenario": _state.current_scenario if _state.is_running else None,
        "is_running": _state.is_running,
    }


@router.get("/api/simulator/status")
def get_simulator_status():
    """Get current running simulation status."""
    return {
        "is_running": _state.is_running,
        "current_scenario": _state.current_scenario,
        "current_machine": _state.current_machine,
        "packets_sent": _state.packets_sent,
        "speed": _state.speed,
    }


@router.post("/api/simulator/start")
def start_simulator(req: StartSimulationRequest):
    """Start a simulation scenario in the background."""
    if _state.is_running:
        _state._stop_event.set()
        if _state._thread and _state._thread.is_alive():
            _state._thread.join(timeout=1.5)

    _state.is_running = True
    _state.current_scenario = req.scenario
    _state.current_machine = req.machine_id or DEMO_SCENARIOS.get(req.scenario, DEMO_SCENARIOS["degrading"]).machine_id
    _state.packets_sent = 0
    _state.speed = req.speed
    _state._stop_event.clear()

    t = threading.Thread(target=_run_sim_worker, args=(req, _state._stop_event), daemon=True)
    _state._thread = t
    t.start()

    return {
        "status": "started",
        "scenario": req.scenario,
        "machine_id": _state.current_machine,
        "speed": req.speed,
    }


@router.post("/api/simulator/stop")
def stop_simulator():
    """Stop the running simulation."""
    if not _state.is_running:
        return {"status": "not_running"}

    _state._stop_event.set()
    _state.is_running = False
    return {"status": "stopped", "packets_sent": _state.packets_sent}
