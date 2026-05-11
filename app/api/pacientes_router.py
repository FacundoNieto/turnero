#En este archivo definimos las rutas o endpoints relacionados con la gestión de pacientes.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.paciente_model import Paciente
from app.schemas.paciente_schema import PacienteCreate, PacienteOut, PacienteUpdate

from app.core.deps import get_current_user, require_permission

paciente_router = APIRouter(prefix = "/pacientes", tags=["pacientes"])

@paciente_router.post("", response_model=PacienteOut)
def crear_paciente(
    payload: PacienteCreate, 
    db: Session = Depends(get_db),
    user  = Depends(get_current_user),
    scope: str = Depends(require_permission("pacientes.crear")),
):
    #crea exitosamente los pacientes pero queda modificar la tabla pacientes para que se agregen dni y cuit, y se valide que no se repitan

    if payload.canal_contacto not in ['whatsapp', 'telegram', 'sms']:
        raise HTTPException(
            status_code=400, 
            detail="Canal de contacto inválido. Debe ser 'whatsapp', 'telegram' o 'sms'."
        )
    
    paciente = Paciente(
        nombre = payload.nombre,
        dni = payload.dni,
        cuil = payload.cuil,
        telefono = payload.telefono,
        canal_contacto = payload.canal_contacto,
    )
    db.add(paciente)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail= "Error al crear paciente\n" + str(e))
    db.refresh(paciente)
    return paciente

# Agregar metodos get que devuelvan todos los pacientes y pacientes por id, y metodos patch para actualizar pacientes

@paciente_router.get("", response_model=list[PacienteOut])
def obtener_pacientes(
    db: Session = Depends(get_db),
    user  = Depends(get_current_user),
    scope: str = Depends(require_permission("pacientes.ver")),
):
    pacientes = db.query(Paciente).all()
    return pacientes


@paciente_router.get("/{paciente_id}", response_model=PacienteOut)
def obtener_paciente_por_id(
    paciente_id: int, 
    db: Session = Depends(get_db),
    user  = Depends(get_current_user),
    scope: str = Depends(require_permission("pacientes.ver")),
):
    paciente = db.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    return paciente


@paciente_router.patch("/{paciente_id}", response_model=PacienteOut)
def editar_paciente(
    paciente_id: int,
    payload: PacienteUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    scope: str = Depends(require_permission("pacientes.editar")),
):
    paciente = db.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")

    # PATCH parcial: solo se actualiza lo que vino
    data = payload.model_dump(exclude_unset=True)

    # Si no mandaron nada, evitamos un "update vacío"
    if not data:
        raise HTTPException(status_code=400, detail="No se enviaron campos para actualizar.")

    # Guard-rail: only users with role 'admin' may change the 'activo' flag
    if 'activo' in data:
        # user.roles is a list of Rol objects with attribute 'nombre'
        roles = getattr(user, 'roles', []) or []
        role_names = [getattr(r, 'nombre', '').lower() for r in roles]
        if 'admin' not in role_names:
            raise HTTPException(status_code=403, detail="Solo admin puede cambiar el estado activo del paciente")

    for field, value in data.items():
        setattr(paciente, field, value)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al editar paciente\n" + str(e))

    db.refresh(paciente)
    return paciente