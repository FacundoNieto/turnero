# En este archivo definimos las rutas o endpoints relacionados con la gestión de profesionales.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.profesional_schema import ProfesionalCreate, ProfesionalOut, ProfesionalUpdate
from app.models.profesional_model import Profesional

from app.core.deps import get_current_user, require_permission


profesionales_router = APIRouter(prefix="/profesionales", tags=["profesionales"])

@profesionales_router.post("", response_model=ProfesionalOut)
def crear_profesional(
    payload: ProfesionalCreate, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("profesionales.crear")),
):
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
def obtener_profesionales(
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("profesionales.ver")),
):
    profesionales = db.query(Profesional).all()
    return profesionales

@profesionales_router.get("/{profesional_id}", response_model=ProfesionalOut)
def obtener_profesional_por_id(
    profesional_id: int, 
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("profesionales.ver")),    
):
    profesional = db.get(Profesional, profesional_id)
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")
    return profesional


@profesionales_router.patch("/{profesional_id}", response_model=ProfesionalOut)
def editar_profesional(
    profesional_id: int,
    payload: ProfesionalUpdate,
    db: Session = Depends(get_db),
    user = Depends(get_current_user),
    scope: str = Depends(require_permission("profesionales.editar")),
):
    profesional = db.get(Profesional, profesional_id)
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado.")
    
    # PATCH parcial: solo se actualiza lo que vino
    data = payload.model_dump(exclude_unset=True)

    # Si no mandaron nada, evitamos un "update vacío"
    if not data:
        raise HTTPException(status_code=400, detail="No se enviaron campos para actualizar.")
    
    for field, value in data.items():
        setattr(profesional, field, value)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al editar paciente\n" + str(e))

    db.refresh(profesional)
    return profesional