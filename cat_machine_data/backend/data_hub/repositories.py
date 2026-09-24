"""Data repositories providing high-level CRUD and analytics queries."""

import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from backend.data_hub.models import (
    Machine,
    Operator,
    Telemetry,
    MachineCurrentState,
    Task,
    SafetyEvent,
    MaintenanceRecord,
    Incident,
    PredictionHistory,
    Insight,
)


class MachineRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[Machine]:
        return self.db.query(Machine).all()

    def get_by_id(self, machine_id: str) -> Optional[Machine]:
        return self.db.query(Machine).filter(Machine.machine_id == machine_id).first()

    def get_current_state(self, machine_id: str) -> Optional[MachineCurrentState]:
        return self.db.query(MachineCurrentState).filter(MachineCurrentState.machine_id == machine_id).first()

    def get_all_current_states(self) -> List[MachineCurrentState]:
        return self.db.query(MachineCurrentState).all()

    def upsert_current_state(self, state_data: Dict[str, Any]) -> MachineCurrentState:
        machine_id = state_data["machine_id"]
        existing = self.get_current_state(machine_id)
        now_str = datetime.now(timezone.utc).isoformat()
        state_data["updated_at"] = now_str

        if existing:
            for key, val in state_data.items():
                setattr(existing, key, val)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            state = MachineCurrentState(**state_data)
            self.db.add(state)
            self.db.commit()
            self.db.refresh(state)
            return state

    def get_fleet_summary(self) -> Dict[str, Any]:
        total_machines = self.db.query(Machine).count()
        states = self.get_all_current_states()

        operating = sum(1 for s in states if s.machine_status == "OPERATING")
        idle = sum(1 for s in states if s.machine_status == "IDLE")
        maintenance = sum(1 for s in states if s.machine_status in ("MAINTENANCE", "FAULT"))

        # Machines at risk (active insights with severity HIGH or CRITICAL or unsafe flag)
        active_risks = self.db.query(Insight.machine_id).filter(
            Insight.status == "ACTIVE",
            Insight.severity.in_(["HIGH", "CRITICAL"])
        ).distinct().count()

        active_safety_alerts = sum(
            1 for s in states if s.proximity_alert or s.overspeed_alert or not s.seatbelt_status or s.unsafe_operation
        )

        fleet_utilization = round((operating / total_machines) * 100.0, 1) if total_machines > 0 else 0.0

        # Calculate fleet idle percentage from recent telemetry
        avg_idle = self.db.query(func.avg(Telemetry.idle_time_min)).scalar() or 0.0
        avg_op = self.db.query(func.avg(Telemetry.operating_time_min)).scalar() or 0.0
        total_time = avg_idle + avg_op
        average_idle_percentage = round((avg_idle / total_time) * 100.0, 1) if total_time > 0 else 0.0

        return {
            "total_machines": total_machines,
            "operating": operating,
            "idle": idle,
            "maintenance": maintenance,
            "machines_at_risk": active_risks,
            "active_safety_alerts": active_safety_alerts,
            "fleet_utilization": fleet_utilization,
            "average_idle_percentage": average_idle_percentage,
        }


class TelemetryRepository:
    def __init__(self, db: Session):
        self.db = db

    def insert(self, record_data: Dict[str, Any]) -> Telemetry:
        record = Telemetry(**record_data)
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def insert_bulk(self, records_data: List[Dict[str, Any]]) -> int:
        records = [Telemetry(**d) for d in records_data]
        self.db.bulk_save_objects(records)
        self.db.commit()
        return len(records)

    def get_latest_for_machine(self, machine_id: str, limit: int = 12) -> List[Telemetry]:
        """Fetch last N observations ordered chronologically."""
        sub = (
            self.db.query(Telemetry)
            .filter(Telemetry.machine_id == machine_id)
            .order_by(desc(Telemetry.timestamp))
            .limit(limit)
            .all()
        )
        return sorted(sub, key=lambda x: x.timestamp)

    def get_recent_history(self, machine_id: str, limit: int = 50) -> List[Telemetry]:
        sub = (
            self.db.query(Telemetry)
            .filter(Telemetry.machine_id == machine_id)
            .order_by(desc(Telemetry.timestamp))
            .limit(limit)
            .all()
        )
        return sorted(sub, key=lambda x: x.timestamp)

    def exists_timestamp(self, machine_id: str, timestamp: str) -> bool:
        return (
            self.db.query(Telemetry.id)
            .filter(Telemetry.machine_id == machine_id, Telemetry.timestamp == timestamp)
            .first()
            is not None
        )


class OperatorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[Operator]:
        return self.db.query(Operator).all()

    def get_by_id(self, operator_id: str) -> Optional[Operator]:
        return self.db.query(Operator).filter(Operator.operator_id == operator_id).first()


class PredictionRepository:
    def __init__(self, db: Session):
        self.db = db

    def log_prediction(
        self,
        machine_id: str,
        prediction_type: str,
        probability: Optional[float] = None,
        predicted_value: Optional[float] = None,
        risk_level: Optional[str] = None,
        model_version: str = "1.0.0",
        signals: Optional[List[str]] = None,
        timestamp: Optional[str] = None,
    ) -> PredictionHistory:
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        signals_json = json.dumps(signals) if signals else None

        pred = PredictionHistory(
            timestamp=ts,
            machine_id=machine_id,
            prediction_type=prediction_type,
            probability=probability,
            predicted_value=predicted_value,
            risk_level=risk_level,
            model_version=model_version,
            signals_json=signals_json,
        )
        self.db.add(pred)
        self.db.commit()
        self.db.refresh(pred)
        return pred

    def get_history(self, machine_id: str, prediction_type: Optional[str] = None, limit: int = 20) -> List[PredictionHistory]:
        q = self.db.query(PredictionHistory).filter(PredictionHistory.machine_id == machine_id)
        if prediction_type:
            q = q.filter(PredictionHistory.prediction_type == prediction_type)
        return q.order_by(desc(PredictionHistory.timestamp)).limit(limit).all()

    def get_latest(self, machine_id: str, prediction_type: str) -> Optional[PredictionHistory]:
        return (
            self.db.query(PredictionHistory)
            .filter(PredictionHistory.machine_id == machine_id, PredictionHistory.prediction_type == prediction_type)
            .order_by(desc(PredictionHistory.timestamp))
            .first()
        )


class InsightRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_or_update(
        self,
        insight_id: str,
        machine_id: str,
        insight_type: str,
        severity: str,
        title: str,
        message: str,
        recommended_action: str,
        source: str,
        risk: Optional[float] = None,
        operator_id: Optional[str] = None,
        timestamp: Optional[str] = None,
    ) -> Insight:
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        existing = self.db.query(Insight).filter(Insight.insight_id == insight_id).first()

        if existing:
            existing.timestamp = ts
            existing.severity = severity
            existing.title = title
            existing.message = message
            existing.recommended_action = recommended_action
            existing.risk = risk
            self.db.commit()
            self.db.refresh(existing)
            return existing

        ins = Insight(
            insight_id=insight_id,
            timestamp=ts,
            machine_id=machine_id,
            operator_id=operator_id,
            type=insight_type,
            severity=severity,
            title=title,
            message=message,
            recommended_action=recommended_action,
            source=source,
            risk=risk,
            status="ACTIVE",
        )
        self.db.add(ins)
        self.db.commit()
        self.db.refresh(ins)
        return ins

    def get_for_machine(self, machine_id: str, status: Optional[str] = None, limit: int = 10) -> List[Insight]:
        q = self.db.query(Insight).filter(Insight.machine_id == machine_id)
        if status:
            q = q.filter(Insight.status == status)
        return q.order_by(desc(Insight.timestamp)).limit(limit).all()

    def acknowledge(self, insight_id: str) -> Optional[Insight]:
        ins = self.db.query(Insight).filter(Insight.insight_id == insight_id).first()
        if ins:
            ins.status = "ACKNOWLEDGED"
            self.db.commit()
            self.db.refresh(ins)
        return ins


class TaskRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, task_id: str) -> Optional[Task]:
        return self.db.query(Task).filter(Task.task_id == task_id).first()

    def get_active_task_for_machine(self, machine_id: str, timestamp: str) -> Optional[Task]:
        return (
            self.db.query(Task)
            .filter(
                Task.machine_id == machine_id,
                Task.actual_start_time <= timestamp,
                Task.actual_end_time >= timestamp,
            )
            .first()
        )

    def get_latest_task_for_machine(self, machine_id: str) -> Optional[Task]:
        return (
            self.db.query(Task)
            .filter(Task.machine_id == machine_id)
            .order_by(desc(Task.actual_start_time))
            .first()
        )

    def get_all(self, limit: int = 50) -> List[Task]:
        return self.db.query(Task).order_by(desc(Task.actual_start_time)).limit(limit).all()


class SafetyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_events_for_machine(self, machine_id: str, limit: int = 20) -> List[SafetyEvent]:
        return (
            self.db.query(SafetyEvent)
            .filter(SafetyEvent.machine_id == machine_id)
            .order_by(desc(SafetyEvent.event_start))
            .limit(limit)
            .all()
        )

    def get_recent_alerts(self, limit: int = 20) -> List[SafetyEvent]:
        return (
            self.db.query(SafetyEvent)
            .order_by(desc(SafetyEvent.event_start))
            .limit(limit)
            .all()
        )


class MaintenanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_records_for_machine(self, machine_id: str, limit: int = 20) -> List[MaintenanceRecord]:
        return (
            self.db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.machine_id == machine_id)
            .order_by(desc(MaintenanceRecord.timestamp))
            .limit(limit)
            .all()
        )

    def create_request(
        self,
        maintenance_id: str,
        timestamp: str,
        machine_id: str,
        component: str,
        severity: str,
        engine_hours: float,
        description: str,
    ) -> MaintenanceRecord:
        record = MaintenanceRecord(
            maintenance_id=maintenance_id,
            timestamp=timestamp,
            machine_id=machine_id,
            maintenance_type="Operator Service Request",
            component=component,
            severity=severity,
            engine_hours=engine_hours,
            description=description,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record


class IncidentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, machine_id: Optional[str] = None, limit: int = 50) -> List[Incident]:
        q = self.db.query(Incident)
        if machine_id:
            q = q.filter(Incident.machine_id == machine_id)
        return q.order_by(desc(Incident.timestamp)).limit(limit).all()

    def get_by_id(self, incident_id: str) -> Optional[Incident]:
        return self.db.query(Incident).filter(Incident.incident_id == incident_id).first()

    def create(
        self,
        incident_id: str,
        timestamp: str,
        machine_id: str,
        operator_id: str,
        incident_type: str,
        severity: str,
        description: str,
    ) -> Incident:
        inc = Incident(
            incident_id=incident_id,
            timestamp=timestamp,
            machine_id=machine_id,
            operator_id=operator_id,
            incident_type=incident_type,
            severity=severity,
            description=description,
        )
        self.db.add(inc)
        self.db.commit()
        self.db.refresh(inc)
        return inc
