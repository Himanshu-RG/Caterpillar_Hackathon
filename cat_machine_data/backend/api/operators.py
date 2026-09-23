"""Operator pool and behavior analytics endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import OperatorRepository
from backend.api.schemas import OperatorResponse

router = APIRouter(tags=["Operators"])


@router.get("/api/operators", response_model=List[OperatorResponse])
def list_operators(db: Session = Depends(get_db)):
    """Retrieve full operator catalog with skill and compliance scores."""
    op_repo = OperatorRepository(db)
    return op_repo.get_all()


@router.get("/api/operators/{operator_id}", response_model=OperatorResponse)
def get_operator(operator_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a specific equipment operator."""
    op_repo = OperatorRepository(db)
    op = op_repo.get_by_id(operator_id)
    if not op:
        raise HTTPException(status_code=404, detail=f"Operator '{operator_id}' not found")
    return op
