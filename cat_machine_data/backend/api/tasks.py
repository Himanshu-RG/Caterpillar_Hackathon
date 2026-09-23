"""Task queries and work order endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.data_hub.database import get_db
from backend.data_hub.repositories import TaskRepository
from backend.api.schemas import TaskResponse

router = APIRouter(tags=["Tasks"])


@router.get("/api/tasks/today", response_model=List[TaskResponse])
def get_todays_tasks(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieve today's active and completed earthmoving tasks."""
    t_repo = TaskRepository(db)
    tasks = t_repo.get_all(limit=limit)
    return [
        TaskResponse(
            task_id=t.task_id,
            task_type=t.task_type,
            machine_id=t.machine_id,
            operator_id=t.operator_id,
            planned_quantity_tonnes=t.planned_quantity_tonnes,
            actual_quantity_tonnes=t.actual_quantity_tonnes,
            estimated_time_min=t.estimated_time_min,
            actual_time_min=t.actual_time_min,
            actual_start_time=t.actual_start_time,
            actual_end_time=t.actual_end_time,
        )
        for t in tasks
    ]


@router.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task_by_id(task_id: str, db: Session = Depends(get_db)):
    """Retrieve single task details by ID."""
    t_repo = TaskRepository(db)
    t = t_repo.get_by_id(task_id)
    if not t:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return TaskResponse(
        task_id=t.task_id,
        task_type=t.task_type,
        machine_id=t.machine_id,
        operator_id=t.operator_id,
        planned_quantity_tonnes=t.planned_quantity_tonnes,
        actual_quantity_tonnes=t.actual_quantity_tonnes,
        estimated_time_min=t.estimated_time_min,
        actual_time_min=t.actual_time_min,
        actual_start_time=t.actual_start_time,
        actual_end_time=t.actual_end_time,
    )
