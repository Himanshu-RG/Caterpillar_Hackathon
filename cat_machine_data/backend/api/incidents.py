"""Incident reporting and query endpoints."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import IncidentRepository, MachineRepository
from backend.api.schemas import IncidentResponse, CreateIncidentRequest

router = APIRouter(tags=["Incidents"])


@router.get("/api/incidents", response_model=List[IncidentResponse])
def get_incidents(
    machine_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieve operational incident logs across fleet or for a specific machine."""
    repo = IncidentRepository(db)
    records = repo.get_all(machine_id=machine_id, limit=limit)
    return [
        IncidentResponse(
            incident_id=r.incident_id,
            timestamp=r.timestamp,
            machine_id=r.machine_id,
            operator_id=r.operator_id,
            incident_type=r.incident_type,
            severity=r.severity,
            description=r.description,
        )
        for r in records
    ]


@router.post("/api/incidents", response_model=IncidentResponse)
def create_incident(req: CreateIncidentRequest, db: Session = Depends(get_db)):
    """Log a new operational incident submitted by an operator or supervisor."""
    m_repo = MachineRepository(db)
    machine = m_repo.get_by_id(req.machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{req.machine_id}' not found")

    repo = IncidentRepository(db)
    inc_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
    ts = req.timestamp or datetime.now(timezone.utc).isoformat()

    inc = repo.create(
        incident_id=inc_id,
        timestamp=ts,
        machine_id=req.machine_id,
        operator_id=req.operator_id or "OP001",
        incident_type=req.incident_type,
        severity=req.severity,
        description=req.description,
    )

    return IncidentResponse(
        incident_id=inc.incident_id,
        timestamp=inc.timestamp,
        machine_id=inc.machine_id,
        operator_id=inc.operator_id,
        incident_type=inc.incident_type,
        severity=inc.severity,
        description=inc.description,
    )
