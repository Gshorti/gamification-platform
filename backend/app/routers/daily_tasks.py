from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import User, Team, DailyTask, DailyCompletion
from app.schemas.schemas import DailyTaskCreate, DailyTaskOut
from app.routers.deps import require_pm

router = APIRouter(prefix="/daily-tasks", tags=["daily-tasks"])


def _get_pm_team(user: User, db: Session) -> Team:
    team = db.query(Team).filter(Team.pm_id == user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return team


def _serialize(task: DailyTask) -> dict:
    return {
        "id": task.id,
        "description": task.description,
        "points": task.points,
        "date": task.date,
        "completions_count": len(task.completions),
        "created_at": task.created_at,
    }


@router.get("/my", response_model=List[DailyTaskOut])
def list_daily(user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    tasks = db.query(DailyTask).filter(DailyTask.team_id == team.id).order_by(DailyTask.date.desc()).all()
    return [_serialize(t) for t in tasks]


@router.post("/", response_model=DailyTaskOut, status_code=201)
def create_daily(data: DailyTaskCreate, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    task = DailyTask(
        team_id=team.id,
        description=data.description,
        points=data.points,
        date=data.date or date_type.today()
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _serialize(task)


@router.delete("/{task_id}", status_code=204)
def delete_daily(task_id: int, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.team_id == team.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    db.delete(task)
    db.commit()


@router.post("/{task_id}/complete/{member_id}", status_code=201)
def mark_complete(task_id: int, member_id: int, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    """Mark a member as having completed a daily task."""
    team = _get_pm_team(user, db)
    task = db.query(DailyTask).filter(DailyTask.id == task_id, DailyTask.team_id == team.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    exists = db.query(DailyCompletion).filter(
        DailyCompletion.task_id == task_id,
        DailyCompletion.member_id == member_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Уже выполнено")
    completion = DailyCompletion(task_id=task_id, member_id=member_id)
    db.add(completion)
    db.commit()
    return {"ok": True}
