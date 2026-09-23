"""Maintenance history query endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import MaintenanceRepository, MachineRepository

router = APIRouter(tags=["Maintenance"])


@router.get("/api/maintenance/{machine_id}")
def get_machine_maintenance(machine_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve maintenance work orders and inspection history for a machine."""
    m_repo = MachineRepository(db)
    maint_repo = MaintenanceRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    records = maint_repo.get_records_for_machine(machine_id, limit=limit)
    return [
        {
            "maintenance_id": r.maintenance_id,
            "timestamp": r.timestamp,
            "machine_id": r.machine_id,
            "maintenance_type": r.maintenance_type,
            "component": r.component,
            "severity": r.severity,
            "engine_hours": r.engine_hours,
            "description": r.description,
        }
        for r in records
    ]
