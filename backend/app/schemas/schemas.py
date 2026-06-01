from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel

from app.models.models import UserRole, ChallengeLevel


# === AUTH ===
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    role: UserRole

    class Config:
        from_attributes = True


# === MEMBER ===
class MemberCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    role_in_project: Optional[str] = None


class MemberUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role_in_project: Optional[str] = None


class MemberOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str]
    role_in_project: Optional[str]
    total_points: int
    daily_streak: int
    created_at: datetime

    class Config:
        from_attributes = True


# === TEAM ===
class TeamUpdate(BaseModel):
    name: str


class TeamOut(BaseModel):
    id: int
    name: str
    pm_id: int | None 
    pm_name: Optional[str] = None
    members_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# === CHALLENGE ===
class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    level: ChallengeLevel
    points: int
    example: Optional[str] = None


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    level: ChallengeLevel
    points: int
    example: Optional[str]
    created_at: datetime
    pm_name: Optional[str] = None
    team_name: Optional[str] = None

    class Config:
        from_attributes = True


# === DAILY TASK ===
class DailyTaskCreate(BaseModel):
    description: str
    points: int = 5
    date: str = None


class DailyTaskOut(BaseModel):
    id: int
    description: str
    points: int
    date: Optional[date]
    completions_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# === POINTS ===
class AwardPointsIn(BaseModel):
    member_id: int
    points: int
    source_type: str = "manual"
    source_id: Optional[int] = None
    comment: Optional[str] = None


class PointLogOut(BaseModel):
    id: int
    points: int
    source_type: str
    comment: Optional[str]
    created_at: datetime
    member_name: Optional[str] = None
    awarded_by_name: Optional[str] = None

    class Config:
        from_attributes = True


# === PRIZE ===
class PrizeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cost: int
    level: ChallengeLevel


class PrizeOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    cost: int
    level: ChallengeLevel
    is_active: bool

    class Config:
        from_attributes = True


# === ADMIN ===
class PMCreate(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: str
    team_name: Optional[str] = None


class PMUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    team_name: Optional[str] = None
    is_active: Optional[bool] = None


class PMResetPassword(BaseModel):
    new_password: str


class PMOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    is_active: bool = True
    team_name: Optional[str] = None
    team_id: Optional[int] = None
    members_count: int = 0
    challenges_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class AdminMemberOut(MemberOut):
    team_name: Optional[str] = None
    team_id: Optional[int] = None


class AdminAwardPoints(BaseModel):
    member_id: int
    points: int          # positive = award, negative = deduct
    comment: Optional[str] = None


# === ANALYTICS ===
class TeamStats(BaseModel):
    team_id: int
    team_name: str
    pm_name: Optional[str]
    members_count: int
    total_points: int
    challenges_count: int
    light_count: int
    medium_count: int
    hard_count: int


class AnalyticsOut(BaseModel):
    total_pms: int
    total_teams: int
    total_members: int
    total_points: int
    total_challenges: int
    challenges_by_level: dict
    top_members: List[AdminMemberOut]
    teams_stats: List[TeamStats]
    points_by_day: List[dict]   # [{date, points}]


Token.model_rebuild()
