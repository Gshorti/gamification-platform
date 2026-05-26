from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr

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
class TeamOut(BaseModel):
    id: int
    name: str
    pm_id: int
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

    class Config:
        from_attributes = True


# === DAILY TASK ===
class DailyTaskCreate(BaseModel):
    description: str
    points: int = 5
    date: str


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


class PMOut(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: Optional[str]
    team_name: Optional[str] = None
    members_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class AdminMemberOut(MemberOut):
    team_name: Optional[str] = None


Token.model_rebuild()
