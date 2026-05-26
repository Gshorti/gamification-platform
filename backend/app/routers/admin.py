from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import hash_password
from app.models.models import User, Team, Member, Challenge, UserRole
from app.schemas.schemas import PMCreate, PMOut, TeamOut, ChallengeOut, AdminMemberOut
from app.routers.deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/pms", response_model=List[PMOut])
def list_pms(user=Depends(require_admin), db: Session = Depends(get_db)):
    pms = db.query(User).filter(User.role == UserRole.pm).all()
    result = []
    for pm in pms:
        team = pm.team
        result.append(PMOut(
            id=pm.id,
            username=pm.username,
            full_name=pm.full_name,
            email=pm.email,
            team_name=team.name if team else None,
            members_count=len(team.members) if team else 0,
            created_at=pm.created_at,
        ))
    return result


@router.post("/pms", response_model=PMOut, status_code=201)
def create_pm(data: PMCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Логин уже занят")

    pm = User(
        username=data.username,
        full_name=data.full_name,
        email=data.email,
        hashed_password=data.password,
        role=UserRole.pm
    )
    db.add(pm)
    db.flush()

    team_name = data.team_name or f"Команда {pm.username}"
    team = Team(name=team_name, pm_id=pm.id)
    db.add(team)
    db.commit()
    db.refresh(pm)

    return PMOut(
        id=pm.id,
        username=pm.username,
        full_name=pm.full_name,
        email=pm.email,
        team_name=team.name,
        members_count=0,
        created_at=pm.created_at,
    )


@router.delete("/pms/{pm_id}", status_code=204)
def delete_pm(pm_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    pm = db.query(User).filter(User.id == pm_id, User.role == UserRole.pm).first()
    if not pm:
        raise HTTPException(status_code=404, detail="ПМ не найден")
    db.delete(pm)
    db.commit()


@router.get("/teams", response_model=List[TeamOut])
def list_teams(user=Depends(require_admin), db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        result.append(TeamOut(
            id=t.id,
            name=t.name,
            pm_id=t.pm_id,
            pm_name=t.pm.full_name or t.pm.username if t.pm else None,
            members_count=len(t.members),
            created_at=t.created_at,
        ))
    return result


@router.get("/members", response_model=List[AdminMemberOut])
def list_all_members(user=Depends(require_admin), db: Session = Depends(get_db)):
    members = db.query(Member).all()
    result = []
    for m in members:
        obj = AdminMemberOut.model_validate(m)
        obj.team_name = m.team.name if m.team else None
        result.append(obj)
    return result


@router.get("/challenges", response_model=List[ChallengeOut])
def list_all_challenges(user=Depends(require_admin), db: Session = Depends(get_db)):
    challenges = db.query(Challenge).all()
    result = []
    for c in challenges:
        obj = ChallengeOut.model_validate(c)
        if c.team and c.team.pm:
            obj.pm_name = c.team.pm.full_name or c.team.pm.username
        result.append(obj)
    return result
