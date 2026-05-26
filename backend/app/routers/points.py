from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, Team, Member, PointLog
from app.schemas.schemas import AwardPointsIn
from app.routers.deps import require_pm

router = APIRouter(prefix="/points", tags=["points"])


@router.post("/award", status_code=201)
def award_points(data: AwardPointsIn, user: User = Depends(require_pm), db: Session = Depends(get_db)):
    # Verify member belongs to PM's team
    team = db.query(Team).filter(Team.pm_id == user.id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    member = db.query(Member).filter(Member.id == data.member_id, Member.team_id == team.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден в вашей команде")

    # Update points
    member.total_points += data.points

    # Log it
    log = PointLog(
        member_id=member.id,
        points=data.points,
        source_type=data.source_type,
        source_id=data.source_id,
        comment=data.comment,
        awarded_by=user.id
    )
    db.add(log)
    db.commit()
    db.refresh(member)

    return {"ok": True, "total_points": member.total_points}
