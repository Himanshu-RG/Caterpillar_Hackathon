"""CLI tool to start the live telematics machine simulator."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import argparse
import logging
import requests
from backend.simulator.scenario_controller import ScenarioController, DEMO_SCENARIOS
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_standalone_pipeline(packet: dict, db, feature_engine, safety_rules, machine_rules, failure_pred, safety_pred, insight_engine):
    """Direct local pipeline when HTTP backend is not targeted."""
    ingestion = TelemetryIngestionService(db)
    valid, record, err = ingestion.ingest_packet(packet)
    if not valid:
        logger.warning("Packet ingestion rejected: %s", err)
        return

    m_repo = MachineRepository(db)
    op_repo = OperatorRepository(db)
    pred_repo = PredictionRepository(db)
    ins_repo = InsightRepository(db)

    machine_id = packet["machine_id"]
    machine = m_repo.get_by_id(machine_id)
    operator = op_repo.get_by_id(packet.get("operator_id"))

    # 1. Real-time Feature Engine
    metrics = feature_engine.update_and_compute_metrics(packet, machine=machine, operator=operator)
    failure_df = feature_engine.build_failure_feature_vector(metrics)
    safety_df = feature_engine.build_safety_feature_vector(metrics)

    # 2. Rule Engine
    safety_violations = safety_rules.evaluate(packet, machine_type=machine.machine_type if machine else "Hydraulic Excavator")
    machine_anomalies = machine_rules.evaluate(metrics)

    # 3. ML Inference
    f_res = failure_pred.predict(machine_id, failure_df, timestamp=packet.get("timestamp"))
    s_res = safety_pred.predict(machine_id, safety_df, timestamp=packet.get("timestamp"))

    # Log predictions
    pred_repo.log_prediction(
        machine_id=machine_id,
        prediction_type="FAILURE",
        probability=f_res["failure_probability"],
        risk_level=f_res["risk_level"],
        signals=f_res["top_contributing_signals"],
        timestamp=packet.get("timestamp"),
    )

    # 4. Insight Engine
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

    for ins in insights:
        ins_repo.create_or_update(
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

    # Console display of live telemetry & analytics
    hyd_temp = packet.get("hydraulic_temp_c", 0.0)
    oil_press = packet.get("oil_pressure_bar", 0.0)
    risk_col = f_res['risk_level']
    logger.info(
        "[%s] Machine: %s | RPM: %4.0f | HydTemp: %5.1f°C | OilPress: %4.2f bar | FailureRisk: %5.1f%% (%s)",
        packet.get("timestamp"),
        machine_id,
        float(packet.get("engine_rpm", 0.0)),
        float(hyd_temp),
        float(oil_press),
        f_res["failure_probability"] * 100.0,
        risk_col,
    )
    for v in safety_violations:
        logger.warning("  🚨 [SAFETY ALERT - %s] %s: %s", v.severity, v.title, v.message)
    for a in machine_anomalies:
        logger.info("  ⚠️  [ANOMALY - %s] %s: %s", a.severity, a.title, a.message)
    for ins in insights:
        if ins.severity in ("HIGH", "CRITICAL"):
            logger.info("  💡 [INSIGHT - %s] %s -> Action: %s", ins.severity, ins.title, ins.recommended_action)


def main():
    parser = argparse.ArgumentParser(description="Live Industrial Telematics Simulator CLI")
    parser.add_argument(
        "--scenario",
        type=str,
        default="degrading",
        choices=list(DEMO_SCENARIOS.keys()),
        help="Deterministic demonstration scenario to run",
    )
    parser.add_argument("--machine", type=str, default=None, help="Override machine ID")
    parser.add_argument("--speed", type=float, default=1.0, help="Simulation time speedup factor (e.g. 1, 2, 5, 10)")
    parser.add_argument("--interval", type=float, default=2.0, help="Base packet interval in seconds (default 2.0)")
    parser.add_argument("--mode", type=str, default="replay", choices=["replay", "live"], help="Simulator mode")
    parser.add_argument("--limit", type=int, default=60, help="Number of telemetry packets to emit")
    parser.add_argument("--ingest-url", type=str, default=None, help="HTTP API ingestion URL (e.g. http://localhost:8000/api/telemetry/ingest)")
    parser.add_argument("--no-sleep", action="store_true", help="Run without sleeping (fast evaluation)")

    args = parser.parse_args()

    scenario = ScenarioController.get_scenario(args.scenario)
    machine_id = args.machine or scenario.machine_id
    limit = args.limit or scenario.default_limit
    start_index = scenario.default_start_index

    logger.info("=" * 65)
    logger.info("STARTING TELEMETRY SIMULATOR")
    logger.info("=" * 65)
    logger.info("Selected Scenario : %s", scenario.name.upper())
    logger.info("Machine ID        : %s", machine_id)
    logger.info("Description       : %s", scenario.description)
    logger.info("Simulator Mode    : %s", args.mode.upper())
    logger.info("Speed Multiplier  : %.1fx (Packet interval: %.2fs)", args.speed, args.interval / args.speed)
    logger.info("Packet Limit      : %d packets", limit)
    logger.info("=" * 65)

    simulator = TelemetrySimulator(
        mode=args.mode,
        speed_factor=args.speed,
        base_interval_seconds=args.interval,
    )

    db = SessionLocal()
    feature_mgr = FeatureBufferManager()
    feature_mgr.preload_from_db(db, machine_id, limit=288)
    feature_engine = RealtimeFeatureEngine(buffer_manager=feature_mgr)
    safety_rules = SafetyRuleEngine()
    machine_rules = MachineRuleEngine()
    failure_pred = FailurePredictor()
    safety_pred = SafetyPredictor()
    insight_engine = InsightEngine()

    packet_count = 0
    try:
        stream = simulator.run_simulation(
            machine_id=machine_id,
            start_index=start_index,
            limit=limit,
            sleep_between_packets=not args.no_sleep,
        )

        for packet in stream:
            packet_count += 1
            if args.ingest_url:
                try:
                    resp = requests.post(args.ingest_url, json=packet, timeout=3.0)
                    if resp.status_code == 200:
                        logger.info("Forwarded packet %d to HTTP backend (status 200)", packet_count)
                    else:
                        logger.warning("Backend returned %d: %s", resp.status_code, resp.text)
                except Exception as exc:
                    logger.error("Failed to connect to backend at %s: %s", args.ingest_url, exc)
            else:
                run_standalone_pipeline(
                    packet, db, feature_engine, safety_rules, machine_rules, failure_pred, safety_pred, insight_engine
                )

        logger.info("=" * 65)
        logger.info("SIMULATION COMPLETED: %d packets processed successfully.", packet_count)
        logger.info("=" * 65)
    finally:
        db.close()


if __name__ == "__main__":
    main()
