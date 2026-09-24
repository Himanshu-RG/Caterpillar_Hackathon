"""Maintenance history and operator service-request endpoints."""

from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import MaintenanceRepository, MachineRepository
from backend.api.schemas import CreateMaintenanceRequest

router = APIRouter(tags=["Maintenance"])


def _serialize(record):
    return {
        "maintenance_id": record.maintenance_id,
        "timestamp": record.timestamp,
        "machine_id": record.machine_id,
        "maintenance_type": record.maintenance_type,
        "component": record.component,
        "severity": record.severity,
        "engine_hours": record.engine_hours,
        "description": record.description,
    }


@router.get("/api/maintenance/{machine_id}")
def get_machine_maintenance(machine_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve maintenance work orders and inspection history for a machine."""
    m_repo = MachineRepository(db)
    maint_repo = MaintenanceRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    records = maint_repo.get_records_for_machine(machine_id, limit=limit)
    return [_serialize(r) for r in records]


@router.post("/api/maintenance/{machine_id}")
def create_maintenance_request(
    machine_id: str,
    req: CreateMaintenanceRequest,
    db: Session = Depends(get_db),
):
    """Persist an urgent operator-generated maintenance request."""
    machine = MachineRepository(db).get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    timestamp = datetime.now(timezone.utc).isoformat()
    request_id = f"WO-{machine_id}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
    record = MaintenanceRepository(db).create_request(
        maintenance_id=request_id,
        timestamp=timestamp,
        machine_id=machine_id,
        component=req.component,
        severity=req.severity,
        engine_hours=req.engine_hours,
        description=req.description,
    )
    return _serialize(record)
