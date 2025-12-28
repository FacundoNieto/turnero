from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

estados_turno_router = APIRouter(prefix="/estados_turno", tags=["estados_turno"])  

from app.models.estado_turno_model import EstadoTurno
from app.schemas.estado_turno_schema import EstadoTurnoOut
from app.database import get_db

@estados_turno_router.get("", response_model=list[EstadoTurnoOut])
def obtener_estados_turno(db: Session = Depends(get_db)):
    estados = db.query(EstadoTurno).all()
    return estados