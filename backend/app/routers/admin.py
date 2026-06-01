from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import User, Team, Member, Challenge, DailyTask, PointLog, UserRole
from app.schemas.schemas import (
    PMCreate, PMUpdate, PMResetPassword, PMOut,
    TeamOut, TeamUpdate,
    ChallengeOut,
    AdminMemberOut, MemberUpdate,
    AdminAwardPoints, PointLogOut,
    AnalyticsOut, TeamStats,
)
from app.routers.deps import require_admin
import hashlib

router = APIRouter(prefix="/admin", tags=["admin"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _pm_out(pm: User) -> PMOut:
    team = pm.team
    return PMOut(
        id=pm.id,
        username=pm.username,
        full_name=pm.full_name,
        email=pm.email,
        is_active=pm.is_active,
        team_name=team.name if team else None,
        team_id=team.id if team else None,
        members_count=len(team.members) if team else 0,
        challenges_count=len(team.challenges) if team else 0,
        created_at=pm.created_at,
    )


def _member_out(m: Member) -> AdminMemberOut:
    obj = AdminMemberOut.model_validate(m)
    obj.team_name = m.team.name if m.team else None
    obj.team_id = m.team_id
    return obj


# ── PM CRUD ───────────────────────────────────────────────────────────────────

@router.get("/pms", response_model=List[PMOut])
def list_pms(user=Depends(require_admin), db: Session = Depends(get_db)):
    return [_pm_out(pm) for pm in db.query(User).filter(User.role == UserRole.pm).all()]


@router.post("/pms", response_model=PMOut, status_code=201)
def create_pm(data: PMCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Логин уже занят")
    pm = User(
        username=data.username,
        full_name=data.full_name,
        email=hashlib.sha256(data.email.encode("utf-8")).hexdigest(),
        hashed_password=hashlib.sha256(data.password.encode("utf-8")).hexdigest(),
        role=UserRole.pm,
    )
    db.add(pm)
    db.flush()
    team = Team(name=data.team_name or f"Команда {pm.username}", pm_id=pm.id)
    db.add(team)
    db.commit()
    db.refresh(pm)
    return _pm_out(pm)


@router.patch("/pms/{pm_id}", response_model=PMOut)
def update_pm(pm_id: int, data: PMUpdate, user=Depends(require_admin), db: Session = Depends(get_db)):
    pm = db.query(User).filter(User.id == pm_id, User.role == UserRole.pm).first()
    if not pm:
        raise HTTPException(404, "ПМ не найден")
    if data.full_name is not None:
        pm.full_name = data.full_name
    if data.email is not None:
        pm.email = hashlib.sha256(data.email.encode("utf-8")).hexdigest()
    if data.is_active is not None:
        pm.is_active = data.is_active
    if data.team_name is not None and pm.team:
        pm.team.name = data.team_name
    db.commit()
    db.refresh(pm)
    return _pm_out(pm)


@router.post("/pms/{pm_id}/reset-password", status_code=200)
def reset_pm_password(pm_id: int, data: PMResetPassword, user=Depends(require_admin), db: Session = Depends(get_db)):
    pm = db.query(User).filter(User.id == pm_id, User.role == UserRole.pm).first()
    if not pm:
        raise HTTPException(404, "ПМ не найден")
    if len(data.new_password) < 6:
        raise HTTPException(400, "Пароль минимум 6 символов")
    pm.hashed_password = hashlib.sha256(data.new_password.encode("utf-8")).hexdigest()
    db.commit()
    return {"ok": True}


@router.delete("/pms/{pm_id}")
def delete_pm(pm_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    pm = db.query(User).filter(User.id == pm_id, User.role == UserRole.pm).first()
    if not pm:
        raise HTTPException(404, "ПМ не найден")
    db.delete(pm)
    team = db.query(Team).filter(Team.pm_id == pm_id).first()
    db.delete(team)
    db.commit()
    return {"OK": True}


# ── TEAMS ─────────────────────────────────────────────────────────────────────

@router.get("/teams", response_model=List[TeamOut])
def list_teams(user=Depends(require_admin), db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return [TeamOut(
        id=t.id, name=t.name, pm_id=t.pm_id,
        pm_name=t.pm.full_name or t.pm.username if t.pm else None,
        members_count=len(t.members), created_at=t.created_at,
    ) for t in teams]


@router.patch("/teams/{team_id}", response_model=TeamOut)
def update_team(team_id: int, data: TeamUpdate, user=Depends(require_admin), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Команда не найдена")
    team.name = data.name
    db.commit()
    db.refresh(team)
    return TeamOut(
        id=team.id, name=team.name, pm_id=team.pm_id,
        pm_name=team.pm.full_name or team.pm.username if team.pm else None,
        members_count=len(team.members), created_at=team.created_at,
    )


@router.get("/teams/{team_id}/members", response_model=List[AdminMemberOut])
def team_members(team_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(404, "Команда не найдена")
    return [_member_out(m) for m in team.members]


# ── MEMBERS ───────────────────────────────────────────────────────────────────

@router.get("/members", response_model=List[AdminMemberOut])
def list_all_members(
    search: Optional[str] = None,
    team_id: Optional[int] = None,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Member)
    if team_id:
        q = q.filter(Member.team_id == team_id)
    members = q.all()
    result = [_member_out(m) for m in members]
    if search:
        s = search.lower()
        result = [m for m in result if s in f"{m.first_name} {m.last_name} {m.email or ''}".lower()]
    return result


@router.patch("/members/{member_id}", response_model=AdminMemberOut)
def update_member(member_id: int, data: MemberUpdate, user=Depends(require_admin), db: Session = Depends(get_db)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(404, "Участник не найден")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(m, field, val)
    db.commit()
    db.refresh(m)
    return _member_out(m)


@router.delete("/members/{member_id}")
def delete_member(member_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(404, "Участник не найден")
    db.delete(m)
    db.commit()
    return {"OK": True}


@router.post("/members/{member_id}/points", status_code=201)
def admin_award_points(member_id: int, data: AdminAwardPoints, user=Depends(require_admin), db: Session = Depends(get_db)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(404, "Участник не найден")
    m.total_points = max(0, m.total_points + data.points)
    log = PointLog(
        member_id=m.id,
        points=data.points,
        source_type="admin_manual",
        comment=data.comment,
        awarded_by=user.id,
    )
    db.add(log)
    db.commit()
    return {"ok": True, "total_points": m.total_points}


@router.get("/members/{member_id}/points-history", response_model=List[PointLogOut])
def member_points_history(member_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    m = db.query(Member).filter(Member.id == member_id).first()
    if not m:
        raise HTTPException(404, "Участник не найден")
    logs = db.query(PointLog).filter(PointLog.member_id == member_id).order_by(PointLog.created_at.desc()).all()
    result = []
    for log in logs:
        awarder = db.query(User).filter(User.id == log.awarded_by).first() if log.awarded_by else None
        result.append(PointLogOut(
            id=log.id,
            points=log.points,
            source_type=log.source_type,
            comment=log.comment,
            created_at=log.created_at,
            member_name=f"{m.first_name} {m.last_name}",
            awarded_by_name=awarder.full_name or awarder.username if awarder else None,
        ))
    return result


# ── CHALLENGES ────────────────────────────────────────────────────────────────

@router.get("/challenges", response_model=List[ChallengeOut])
def list_all_challenges(
    level: Optional[str] = None,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(Challenge)
    if level:
        q = q.filter(Challenge.level == level)
    challenges = q.all()
    result = []
    for c in challenges:
        obj = ChallengeOut.model_validate(c)
        if c.team:
            obj.team_name = c.team.name
            if c.team.pm:
                obj.pm_name = c.team.pm.full_name or c.team.pm.username
        result.append(obj)
    return result


# ── POINT LOGS ────────────────────────────────────────────────────────────────

@router.get("/point-logs", response_model=List[PointLogOut])
def list_point_logs(
    limit: int = 50,
    user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs = db.query(PointLog).order_by(PointLog.created_at.desc()).limit(limit).all()
    result = []
    for log in logs:
        member = db.query(Member).filter(Member.id == log.member_id).first()
        awarder = db.query(User).filter(User.id == log.awarded_by).first() if log.awarded_by else None
        result.append(PointLogOut(
            id=log.id,
            points=log.points,
            source_type=log.source_type,
            comment=log.comment,
            created_at=log.created_at,
            member_name=f"{member.first_name} {member.last_name}" if member else "—",
            awarded_by_name=awarder.full_name or awarder.username if awarder else None,
        ))
    return result


# ── ANALYTICS ─────────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=AnalyticsOut)
def get_analytics(user=Depends(require_admin), db: Session = Depends(get_db)):
    pms = db.query(User).filter(User.role == UserRole.pm).count()
    teams = db.query(Team).all()
    members = db.query(Member).all()
    challenges = db.query(Challenge).all()

    total_points = sum(m.total_points for m in members)
    by_level = {"LIGHT": 0, "MEDIUM": 0, "HARD": 0}
    for c in challenges:
        by_level[c.level.value] += 1

    top_members = sorted(members, key=lambda m: m.total_points, reverse=True)[:10]

    teams_stats = []
    for t in teams:
        ch = [c for c in challenges if c.team_id == t.id]
        teams_stats.append(TeamStats(
            team_id=t.id,
            team_name=t.name,
            pm_name=t.pm.full_name or t.pm.username if t.pm else None,
            members_count=len(t.members),
            total_points=sum(m.total_points for m in t.members),
            challenges_count=len(ch),
            light_count=sum(1 for c in ch if c.level.value == "LIGHT"),
            medium_count=sum(1 for c in ch if c.level.value == "MEDIUM"),
            hard_count=sum(1 for c in ch if c.level.value == "HARD"),
        ))

    # Points by day — last 14 days
    logs = db.query(PointLog).filter(
        PointLog.created_at >= datetime.utcnow() - timedelta(days=14),
        PointLog.points > 0
    ).all()
    by_day: dict = {}
    for log in logs:
        day = log.created_at.strftime("%Y-%m-%d")
        by_day[day] = by_day.get(day, 0) + log.points
    points_by_day = [{"date": k, "points": v} for k, v in sorted(by_day.items())]

    return AnalyticsOut(
        total_pms=pms,
        total_teams=len(teams),
        total_members=len(members),
        total_points=total_points,
        total_challenges=len(challenges),
        challenges_by_level=by_level,
        top_members=[_member_out(m) for m in top_members],
        teams_stats=teams_stats,
        points_by_day=points_by_day,
    )
