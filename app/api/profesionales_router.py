# En este archivo definimos las rutas o endpoints relacionados con la gestión de profesionales.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.profesional_schema import ProfesionalCreate, ProfesionalOut
from app.models.profesional_model import Profesional

profesionales_router = APIRouter(prefix="/profesionales", tags=["profesionales"])

@profesionales_router.post("", response_model=ProfesionalOut)
def crear_profesional(payload: ProfesionalCreate, db: Session = Depends(get_db)):
    profesional = Profesional(
        nombre=payload.nombre,
        especialidad=payload.especialidad,
        duracion_turno_min=payload.duracion_turno_min,
    )

    db.add(profesional)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail= "Error al crear profesional\n" + str(e))
    db.refresh(profesional)
    return profesional

# Agregar metodos get que devuelvan todos los profesionales y profesionales por id, y metodos put para actualizar profesionales

@profesionales_router.get("", response_model=list[ProfesionalOut])
def obtener_profesionales(db: Session = Depends(get_db)):
    profesionales = db.query(Profesional).all()
    return profesionales

@profesionales_router.get("/{profesional_id}", response_model=ProfesionalOut)
def obtener_profesional_por_id(profesional_id: int, db: Session = Depends(get_db)):
    profesional = db.get(Profesional, profesional_id)
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")
    return profesional