# En este archivo definimos las rutas o endpoints relacionados con los bloqueos de agenda para los profesionales.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.schemas.bloqueo_agenda_schema import BloqueoAgendaCreate, BloqueoAgendaOut
from app.models.bloqueo_agenda_model import BloqueoAgenda
from app.core.deps import get_current_user, require_permission

bloqueos_agenda_router = APIRouter(prefix="/bloqueos_agenda", tags=["bloqueos_agenda"])

@bloqueos_agenda_router.post("", response_model=BloqueoAgendaOut)
def crear_bloqueo_agenda(
    payload: BloqueoAgendaCreate, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("agenda.bloqueos.crear")),
):
    if payload.fecha_hora_fin <= payload.fecha_hora_inicio:
        raise HTTPException(status_code=400, detail="fecha_hora_fin debe ser mayor que fecha_hora_inicio")
    
    profesional_id = payload.profesional_id
    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        profesional_id = user.profesional_id

    bloqueo_agenda = BloqueoAgenda(
        profesional_id = payload.profesional_id,
        fecha_hora_inicio = payload.fecha_hora_inicio,
        fecha_hora_fin = payload.fecha_hora_fin,
        motivo = payload.motivo,
        creado_por_usuario_id=user.id,
    )

    db.add(bloqueo_agenda)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el bloqueo de agenda\n" + str(e))
    db.refresh(bloqueo_agenda)
    return bloqueo_agenda

# Agregar metodos get que devuelvan todos los bloqueos de agenda y bloqueos por id, y metodos put para actualizar bloqueos de agenda
@bloqueos_agenda_router.get("", response_model=list[BloqueoAgendaOut])
def obtener_bloqueos_agenda(
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("agenda.bloqueos.ver")),
):

    q = db.query(BloqueoAgenda).filter(BloqueoAgenda.activo == True)

    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        q = q.filter(BloqueoAgenda.profesional_id == user.profesional_id)

    return q.all()

@bloqueos_agenda_router.get("/{bloqueo_id}", response_model=BloqueoAgendaOut)
def obtener_bloqueo_por_id(
    bloqueo_id: int, db: 
    Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("agenda.bloqueos.ver")),
):
    bloqueo = db.get(BloqueoAgenda, bloqueo_id)
    if not bloqueo:
        raise HTTPException(status_code=404, detail="Bloqueo de agenda no encontrado.")

    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        if bloqueo.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este bloqueo.")

    return bloqueo 

@bloqueos_agenda_router.delete("/{bloqueo_id}")
def eliminar_bloqueo(
    bloqueo_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("agenda.bloqueos.eliminar")),
):
    bloqueo = db.get(BloqueoAgenda, bloqueo_id)
    if not bloqueo or not bloqueo.activo:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado.")

    if scope == "OWN":
        if not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        if bloqueo.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este bloqueo.")

    bloqueo.activo = False
    bloqueo.eliminado_en = datetime.utcnow()
    bloqueo.eliminado_por_usuario_id = user.id

    db.commit()
    return {"ok": True}
