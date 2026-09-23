import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import logging
import pandas as pd
from backend.data_hub.database import SessionLocal, init_db
from backend.data_hub.models import (
    Machine,
    Operator,
    Telemetry,
    Task,
    SafetyEvent,
    MaintenanceRecord,
    Incident,
)
from backend.data_hub.repositories import MachineRepository

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DATA_RAW = PROJECT_ROOT / "data" / "raw"


def load_machines(db) -> int:
    path = DATA_RAW / "machine_master.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        m_id = str(row["machine_id"])
        if not db.query(Machine).filter(Machine.machine_id == m_id).first():
            m = Machine(
                machine_id=m_id,
                machine_model=str(row["machine_model"]),
                serial_number=str(row["serial_number"]),
                machine_age_years=float(row["machine_age_years"]),
                commission_date=str(row["commission_date"]),
                machine_type=str(row["machine_type"]),
                site_id=str(row["site_id"]),
            )
            db.add(m)
            count += 1
    db.commit()
    return count


def load_operators(db) -> int:
    path = DATA_RAW / "operators.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        op_id = str(row["operator_id"])
        if not db.query(Operator).filter(Operator.operator_id == op_id).first():
            op = Operator(
                operator_id=op_id,
                operator_skill=str(row["operator_skill"]),
                years_experience=float(row["years_experience"]),
                training_level=str(row["training_level"]),
                certification_status=str(row["certification_status"]),
                historical_safety_score=float(row["historical_safety_score"]),
            )
            db.add(op)
            count += 1
    db.commit()
    return count


def load_tasks(db) -> int:
    path = DATA_RAW / "tasks.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        t_id = str(row["task_id"])
        if not db.query(Task).filter(Task.task_id == t_id).first():
            t = Task(
                task_id=t_id,
                task_type=str(row["task_type"]),
                machine_id=str(row["machine_id"]),
                operator_id=str(row["operator_id"]),
                timestamp=str(row["timestamp"]),
                weather=str(row["weather"]),
                operator_skill=str(row["operator_skill"]),
                machine_age_years=float(row["machine_age_years"]),
                planned_quantity_tonnes=float(row["planned_quantity_tonnes"]),
                actual_quantity_tonnes=float(row["actual_quantity_tonnes"]),
                estimated_time_min=float(row["estimated_time_min"]),
                actual_time_min=float(row["actual_time_min"]),
                cycle_count=int(row.get("cycle_count", 0)),
                average_cycle_time_sec=float(row.get("average_cycle_time_sec", 0.0)),
                planned_start_time=str(row["planned_start_time"]),
                actual_start_time=str(row["actual_start_time"]),
                planned_end_time=str(row["planned_end_time"]),
                actual_end_time=str(row["actual_end_time"]),
            )
            db.add(t)
            count += 1
    db.commit()
    return count


def load_safety_events(db) -> int:
    path = DATA_RAW / "safety_events.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        e_id = str(row["event_id"])
        if not db.query(SafetyEvent).filter(SafetyEvent.event_id == e_id).first():
            ev = SafetyEvent(
                event_id=e_id,
                event_start=str(row["event_start"]),
                event_end=str(row["event_end"]),
                duration_min=float(row["duration_min"]),
                machine_id=str(row["machine_id"]),
                operator_id=str(row["operator_id"]),
                seatbelt_status=bool(row["seatbelt_status"]),
                proximity_alert=bool(row["proximity_alert"]),
                overspeed_alert=bool(row["overspeed_alert"]),
                unsafe_operation=bool(row["unsafe_operation"]),
                event_type=str(row["event_type"]),
                event_severity=str(row["event_severity"]),
            )
            db.add(ev)
            count += 1
    db.commit()
    return count


def load_maintenance(db) -> int:
    path = DATA_RAW / "maintenance.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        m_id = str(row["maintenance_id"])
        if not db.query(MaintenanceRecord).filter(MaintenanceRecord.maintenance_id == m_id).first():
            rec = MaintenanceRecord(
                maintenance_id=m_id,
                timestamp=str(row["timestamp"]),
                machine_id=str(row["machine_id"]),
                maintenance_type=str(row["maintenance_type"]),
                component=str(row["component"]),
                severity=str(row["severity"]),
                engine_hours=float(row["engine_hours"]),
                description=str(row["description"]),
            )
            db.add(rec)
            count += 1
    db.commit()
    return count


def load_incidents(db) -> int:
    path = DATA_RAW / "incidents.csv"
    if not path.exists():
        return 0
    df = pd.read_csv(path)
    count = 0
    for _, row in df.iterrows():
        i_id = str(row["incident_id"])
        if not db.query(Incident).filter(Incident.incident_id == i_id).first():
            inc = Incident(
                incident_id=i_id,
                timestamp=str(row["timestamp"]),
                machine_id=str(row["machine_id"]),
                operator_id=str(row["operator_id"]),
                incident_type=str(row["incident_type"]),
                severity=str(row["severity"]),
                description=str(row["description"]),
            )
            db.add(inc)
            count += 1
    db.commit()
    return count


def load_telemetry(db, max_rows: int = 50000) -> int:
    path = DATA_RAW / "telemetry.csv"
    if not path.exists():
        return 0

    existing_count = db.query(Telemetry).count()
    if existing_count > 0:
        logger.info("Telemetry table already contains %d rows. Skipping raw telemetry reload.", existing_count)
        return 0

    logger.info("Loading initial telemetry records from %s (up to %d rows)...", path, max_rows)
    df = pd.read_csv(path, nrows=max_rows, low_memory=False)

    records = []
    for _, row in df.iterrows():
        rec = Telemetry(
            timestamp=str(row["timestamp"]),
            machine_id=str(row["machine_id"]),
            operator_id=str(row["operator_id"]),
            machine_model=str(row["machine_model"]),
            engine_hours=float(row["engine_hours"]),
            engine_rpm=float(row["engine_rpm"]),
            engine_load_pct=float(row["engine_load_pct"]),
            coolant_temp_c=float(row["coolant_temp_c"]),
            oil_pressure_bar=float(row["oil_pressure_bar"]),
            oil_temperature_c=float(row["oil_temperature_c"]),
            fuel_level_l=float(row["fuel_level_l"]),
            fuel_consumed_l=float(row["fuel_consumed_l"]),
            fuel_rate_l_hr=float(row["fuel_rate_l_hr"]),
            idle_time_min=float(row["idle_time_min"]),
            operating_time_min=float(row["operating_time_min"]),
            speed_kmh=float(row["speed_kmh"]),
            distance_km=float(row["distance_km"]),
            cycle_count=int(row["cycle_count"]),
            cycle_time_sec=float(row["cycle_time_sec"]),
            payload_tonnes=float(row["payload_tonnes"]),
            bucket_load_tonnes=float(row["bucket_load_tonnes"]),
            load_count=int(row["load_count"]),
            hydraulic_pressure_bar=float(row["hydraulic_pressure_bar"]),
            hydraulic_temp_c=float(row["hydraulic_temp_c"]),
            transmission_temp_c=float(row["transmission_temp_c"]),
            battery_voltage_v=float(row["battery_voltage_v"]),
            seatbelt_status=bool(row["seatbelt_status"]),
            proximity_alert=bool(row["proximity_alert"]),
            overspeed_alert=bool(row["overspeed_alert"]),
            unsafe_operation=bool(row["unsafe_operation"]),
            fault_code=str(row["fault_code"]),
            machine_status=str(row["machine_status"]),
            site_id=str(row["site_id"]),
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
        )
        records.append(rec)

    # Bulk insert in batches of 5000
    batch_size = 5000
    for i in range(0, len(records), batch_size):
        db.bulk_save_objects(records[i:i + batch_size])
        db.commit()

    return len(records)


def populate_current_states(db):
    """Seed machine_current_state from the latest telemetry observation for each machine."""
    repo = MachineRepository(db)
    machines = repo.get_all()

    for m in machines:
        latest = (
            db.query(Telemetry)
            .filter(Telemetry.machine_id == m.machine_id)
            .order_by(Telemetry.timestamp.desc())
            .first()
        )
        if latest:
            repo.upsert_current_state({
                "machine_id": latest.machine_id,
                "last_timestamp": latest.timestamp,
                "operator_id": latest.operator_id,
                "machine_model": latest.machine_model,
                "machine_status": latest.machine_status,
                "engine_hours": latest.engine_hours,
                "engine_rpm": latest.engine_rpm,
                "engine_load_pct": latest.engine_load_pct,
                "coolant_temp_c": latest.coolant_temp_c,
                "oil_pressure_bar": latest.oil_pressure_bar,
                "oil_temperature_c": latest.oil_temperature_c,
                "hydraulic_temp_c": latest.hydraulic_temp_c,
                "hydraulic_pressure_bar": latest.hydraulic_pressure_bar,
                "fuel_level_l": latest.fuel_level_l,
                "fuel_rate_l_hr": latest.fuel_rate_l_hr,
                "speed_kmh": latest.speed_kmh,
                "payload_tonnes": latest.payload_tonnes,
                "seatbelt_status": latest.seatbelt_status,
                "proximity_alert": latest.proximity_alert,
                "overspeed_alert": latest.overspeed_alert,
                "unsafe_operation": latest.unsafe_operation,
                "fault_code": latest.fault_code,
                "site_id": latest.site_id,
                "latitude": latest.latitude,
                "longitude": latest.longitude,
            })
        else:
            repo.upsert_current_state({
                "machine_id": m.machine_id,
                "last_timestamp": "2026-01-01 00:00:00",
                "operator_id": "OP1001",
                "machine_model": m.machine_model,
                "machine_status": "IDLE",
                "engine_hours": 1000.0,
                "engine_rpm": 700.0,
                "engine_load_pct": 15.0,
                "coolant_temp_c": 80.0,
                "oil_pressure_bar": 3.0,
                "oil_temperature_c": 90.0,
                "hydraulic_temp_c": 60.0,
                "hydraulic_pressure_bar": 150.0,
                "fuel_level_l": 300.0,
                "fuel_rate_l_hr": 4.0,
                "speed_kmh": 0.0,
                "payload_tonnes": 0.0,
                "seatbelt_status": True,
                "proximity_alert": False,
                "overspeed_alert": False,
                "unsafe_operation": False,
                "fault_code": "NONE",
                "site_id": m.site_id,
                "latitude": 41.52,
                "longitude": -88.08,
            })


def main():
    logger.info("Initializing database...")
    init_db()
    db = SessionLocal()
    try:
        m_count = load_machines(db)
        op_count = load_operators(db)
        t_count = load_tasks(db)
        se_count = load_safety_events(db)
        mt_count = load_maintenance(db)
        inc_count = load_incidents(db)
        tel_count = load_telemetry(db)
        populate_current_states(db)

        logger.info(
            "Historical data load complete: "
            "machines=%d, operators=%d, tasks=%d, safety_events=%d, "
            "maintenance=%d, incidents=%d, telemetry=%d",
            m_count, op_count, t_count, se_count, mt_count, inc_count, tel_count,
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
