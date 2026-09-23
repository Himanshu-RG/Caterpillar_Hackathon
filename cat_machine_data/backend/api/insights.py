"""Actionable insight query and acknowledgement endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import InsightRepository, MachineRepository
from backend.api.schemas import InsightResponse

router = APIRouter(tags=["Insights"])


@router.get("/api/insights/{machine_id}", response_model=List[InsightResponse])
def get_machine_insights(
    machine_id: str,
    status: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Retrieve active or historical recommendations and intelligence insights."""
    m_repo = MachineRepository(db)
    i_repo = InsightRepository(db)

    machine = m_repo.get_by_id(machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine '{machine_id}' not found")

    insights = i_repo.get_for_machine(machine_id, status=status, limit=limit)
    return [
        InsightResponse(
            insight_id=ins.insight_id,
            timestamp=ins.timestamp,
            machine_id=ins.machine_id,
            operator_id=ins.operator_id,
            type=ins.type,
            severity=ins.severity,
            title=ins.title,
            message=ins.message,
            recommended_action=ins.recommended_action,
            source=ins.source,
            risk=ins.risk,
            status=ins.status,
        )
        for ins in insights
    ]


@router.post("/api/insights/{insight_id}/acknowledge", response_model=InsightResponse)
def acknowledge_insight(insight_id: str, db: Session = Depends(get_db)):
    """Mark an insight as acknowledged by the equipment operator or maintenance lead."""
    i_repo = InsightRepository(db)
    ins = i_repo.acknowledge(insight_id)
    if not ins:
        raise HTTPException(status_code=404, detail=f"Insight '{insight_id}' not found")

    return InsightResponse(
        insight_id=ins.insight_id,
        timestamp=ins.timestamp,
        machine_id=ins.machine_id,
        operator_id=ins.operator_id,
        type=ins.type,
        severity=ins.severity,
        title=ins.title,
        message=ins.message,
        recommended_action=ins.recommended_action,
        source=ins.source,
        risk=ins.risk,
        status=ins.status,
    )
