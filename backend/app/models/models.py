from datetime import datetime, date

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    pm = "pm"


class ChallengeLevel(str, enum.Enum):
    LIGHT = "LIGHT"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class User(Base):
    """Admin and PM accounts only."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=True)
    email = Column(String(128), unique=True, nullable=True, index=True)
    hashed_password = Column(String(256), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.pm)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="pm", uselist=False)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    pm_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    pm = relationship("User", back_populates="team")
    members = relationship("Member", back_populates="team", cascade="all, delete-orphan")
    challenges = relationship("Challenge", back_populates="team", cascade="all, delete-orphan")
    daily_tasks = relationship("DailyTask", back_populates="team", cascade="all, delete-orphan")


class Member(Base):
    """Team participant — no login, stored in DB only."""
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String(64), nullable=False)
    last_name = Column(String(64), nullable=False)
    email = Column(String(128), nullable=True)
    role_in_project = Column(String(128), nullable=True)
    total_points = Column(Integer, default=0)
    daily_streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    point_logs = relationship("PointLog", back_populates="member", cascade="all, delete-orphan")


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    level = Column(Enum(ChallengeLevel), nullable=False)
    points = Column(Integer, nullable=False)
    example = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="challenges")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    points = Column(Integer, default=5)
    date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="daily_tasks")
    completions = relationship("DailyCompletion", back_populates="task", cascade="all, delete-orphan")

    @property
    def completions_count(self):
        return len(self.completions)


class DailyCompletion(Base):
    """Marks a member as having completed a daily task."""
    __tablename__ = "daily_completions"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("daily_tasks.id", ondelete="CASCADE"))
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"))
    completed_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("DailyTask", back_populates="completions")


class PointLog(Base):
    """Audit trail for all point awards."""
    __tablename__ = "point_logs"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="CASCADE"))
    points = Column(Integer, nullable=False)
    source_type = Column(String(32))  # "challenge" | "daily" | "manual"
    source_id = Column(Integer, nullable=True)
    comment = Column(String(512), nullable=True)
    awarded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("Member", back_populates="point_logs")


class Prize(Base):
    __tablename__ = "prizes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, nullable=True)
    cost = Column(Integer, nullable=False)
    level = Column(Enum(ChallengeLevel), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
