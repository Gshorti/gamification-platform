#!/usr/bin/env python3
"""
Run once to create the admin user and seed default prizes.
Usage: python init_db.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
from app.models.models import User, UserRole, Prize, ChallengeLevel

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Create admin if not exists
admin = db.query(User).filter(User.username == "admin").first()
if not admin:
    admin = User(
        username="admin",
        full_name="Администратор",
        hashed_password="123",
        role=UserRole.admin,
    )
    db.add(admin)
    print("✅ Admin created: login=admin, password=admin123")
else:
    print("ℹ️  Admin already exists")

# Seed default prizes
if not db.query(Prize).first():
    prizes = [
        Prize(name="Стикерпак", description="Уникальный стикерпак", cost=10, level=ChallengeLevel.LIGHT),
        Prize(name="Брелок", description="Фирменный брелок проекта", cost=35, level=ChallengeLevel.MEDIUM),
        Prize(name="Встреча с экспертом", description="Персональный менторинг от ведущего эксперта", cost=85, level=ChallengeLevel.HARD),
    ]
    db.add_all(prizes)
    print("✅ Default prizes seeded")

db.commit()
db.close()
print("Done!")
