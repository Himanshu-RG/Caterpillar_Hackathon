"""Safety alerts and event query endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import SafetyRepository, MachineRepository
from backend.api.schemas import SafetyAlertResponse

router = APIRouter(tags=["Safety"])


@router.get("/api/safety/alerts", response_model=List[SafetyAlertResponse])
def get_recent_safety_alerts(limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve recent safety events across the entire fleet."""
    s_repo = SafetyRepository(db)
    events = s_repo.get_recent_alerts(limit=limit)
    return [
        SafetyAlertResponse(
            event_id=ev.event_id,
            event_start=ev.event_start,
            event_end=ev.event_end,
            duration_min=ev.duration_min,
            machine_id=ev.machine_id,
            operator_id=ev.operator_id,
            event_type=ev.event_type,
            event_severity=ev.event_severity,
        )
        for ev in events
    ]


@router.get("/api/safety/{machine_id}", response_model=List[SafetyAlertResponse])
def get_machine_safety_events(machine_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Retrieve historical safety violations for a specific machine."""
    m_repo = MachineRepository(db)
    s_repo = SafetyRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    events = s_repo.get_events_for_machine(machine_id, limit=limit)
    return [
        SafetyAlertResponse(
            event_id=ev.event_id,
            event_start=ev.event_start,
            event_end=ev.event_end,
            duration_min=ev.duration_min,
            machine_id=ev.machine_id,
            operator_id=ev.operator_id,
            event_type=ev.event_type,
            event_severity=ev.event_severity,
        )
        for ev in events
    ]
