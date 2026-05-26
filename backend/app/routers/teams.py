from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import User, Team, Member
from app.schemas.schemas import MemberCreate, MemberOut
from app.routers.deps import require_pm

router = APIRouter(prefix="/teams", tags=["teams"])


def _get_pm_team(user: User, db: Session) -> Team:
    team = db.query(Team).filter(Team.pm_id == user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена. Обратитесь к администратору.")
    return team


@router.get("/my/members", response_model=List[MemberOut])
def list_members(user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    return team.members


@router.post("/my/members", response_model=MemberOut, status_code=201)
def add_member(data: MemberCreate, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    member = Member(team_id=team.id, **data.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/my/members/{member_id}", status_code=204)
def remove_member(member_id: int, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.team_id == team.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден")
    db.delete(member)
    db.commit()
