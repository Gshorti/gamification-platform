from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import User, Team, Challenge
from app.schemas.schemas import ChallengeCreate, ChallengeOut
from app.routers.deps import require_pm

router = APIRouter(prefix="/challenges", tags=["challenges"])


def _get_pm_team(user: User, db: Session) -> Team:
    team = db.query(Team).filter(Team.pm_id == user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return team


@router.get("/my", response_model=List[ChallengeOut])
def list_challenges(user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    return team.challenges


@router.post("/", response_model=ChallengeOut, status_code=201)
def create_challenge(data: ChallengeCreate, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    ch = Challenge(team_id=team.id, **data.model_dump())
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete("/{challenge_id}", status_code=204)
def delete_challenge(challenge_id: int, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    team = _get_pm_team(user, db)
    ch = db.query(Challenge).filter(Challenge.id == challenge_id, Challenge.team_id == team.id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Челлендж не найден")
    db.delete(ch)
    db.commit()
