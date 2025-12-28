# En este archivo definimos las rutas o endpoints relacionados con los bloqueos de agenda para los profesionales.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.bloqueo_agenda_schema import BloqueoAgendaCreate, BloqueoAgendaOut
from app.models.bloqueo_agenda_model import BloqueoAgenda

bloqueos_agenda_router = APIRouter(prefix="/bloqueos_agenda", tags=["bloqueos_agenda"])

@bloqueos_agenda_router.post("", response_model=BloqueoAgendaOut)
def crear_bloqueo_agenda(payload: BloqueoAgendaCreate, db: Session = Depends(get_db)):
    if payload.fecha_hora_fin <= payload.fecha_hora_inicio:
        raise HTTPException(status_code=400, detail="fecha_hora_fin debe ser mayor que fecha_hora_inicio")
    
    bloqueo_agenda = BloqueoAgenda(
        profesional_id = payload.profesional_id,
        fecha_hora_inicio = payload.fecha_hora_inicio,
        fecha_hora_fin = payload.fecha_hora_fin,
        motivo = payload.motivo,
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
def obtener_bloqueos_agenda(db: Session = Depends(get_db)):
    bloqueos = db.query(BloqueoAgenda).all()
    return bloqueos 

@bloqueos_agenda_router.get("/{bloqueo_id}", response_model=BloqueoAgendaOut)
def obtener_bloqueo_por_id(bloqueo_id: int, db: Session = Depends(get_db)):
    bloqueo = db.get(BloqueoAgenda, bloqueo_id)
    if not bloqueo:
        raise HTTPException(status_code=404, detail="Bloqueo de agenda no encontrado.")
    return bloqueo 