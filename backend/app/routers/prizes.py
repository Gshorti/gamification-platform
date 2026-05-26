from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Prize
from app.schemas.schemas import PrizeCreate, PrizeOut
from app.routers.deps import require_admin, get_current_user

router = APIRouter(prefix="/prizes", tags=["prizes"])


@router.get("/", response_model=List[PrizeOut])
def list_prizes(db: Session = Depends(get_db)):
    return db.query(Prize).filter(Prize.is_active == True).all()


@router.post("/", response_model=PrizeOut, status_code=201)
def create_prize(data: PrizeCreate, user=Depends(require_admin), db: Session = Depends(get_db)):
    prize = Prize(**data.model_dump())
    db.add(prize)
    db.commit()
    db.refresh(prize)
    return prize


@router.delete("/{prize_id}", status_code=204)
def delete_prize(prize_id: int, user=Depends(require_admin), db: Session = Depends(get_db)):
    prize = db.query(Prize).filter(Prize.id == prize_id).first()
    if not prize:
        raise HTTPException(status_code=404, detail="Приз не найден")
    db.delete(prize)
    db.commit()
