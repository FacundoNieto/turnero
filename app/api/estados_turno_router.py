from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

estados_turno_router = APIRouter(prefix="/estados_turno", tags=["estados_turno"])  

from app.models.estado_turno_model import EstadoTurno
from app.schemas.estado_turno_schema import EstadoTurnoOut
from app.database import get_db

from app.core.deps import get_current_user, require_permission


@estados_turno_router.get("", response_model=list[EstadoTurnoOut])
def obtener_estados_turno(
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("estados_turno.ver")),
):
    estados = db.query(EstadoTurno).all()
    return estados