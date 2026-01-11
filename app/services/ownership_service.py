from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.turno_model import Turno
from app.models.bloqueo_agenda_model import BloqueoAgenda


def assert_turno_ownership(db: Session, user, turno_id: int, scope: str) -> Turno:
    turno = db.execute(select(Turno).where(Turno.id == turno_id)).scalar_one_or_none()
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado")
        if turno.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este turno")

    return turno


def assert_bloqueo_ownership(db: Session, user, bloqueo_id: int, scope: str) -> BloqueoAgenda:
    b = db.execute(select(BloqueoAgenda).where(BloqueoAgenda.id == bloqueo_id)).scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado")
        if b.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este bloqueo")

    return b
