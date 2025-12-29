# En este archivo definimos las rutas o endpoints relacionados con los pedidos de turnos.
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_

from app.schemas.turno_schema import TurnoOut, TurnoCreate
from app.database import get_db
from app.models.turno_model import Turno
from app.models.paciente_model import Paciente
from app.models.profesional_model import Profesional
from app.services.notificaciones_service import programar_notifs_creacion_turno
from app.services.turnos_service import (
    crear_turno as crear_turno_service,
    validar_solapamiento_paciente,
    validar_solapamiento_profesional,
    hay_bloqueo_agenda,
    aplicar_evento_turno,
    _estado_id_por_codigo,
    EVENTO_CONFIRMAR,
    EVENTO_CANCELAR,
    EVENTO_COMPLETAR,
    EVENTO_NO_ASISTIO,
    )

turnos_router = APIRouter(prefix="/turnos", tags=["turnos"])

@turnos_router.post("", response_model = TurnoOut)
def crear_turno(payload: TurnoCreate, db: Session = Depends(get_db)):
    turno = crear_turno_service(
        db,
        paciente_id = payload.paciente_id,
        profesional_id = payload.profesional_id,
        inicio = payload.fecha_hora_inicio,
        fin = payload.fecha_hora_fin,
    )

    return turno

@turnos_router.get("/todos", response_model=list[TurnoOut])
def obtener_turnos_todos(db: Session = Depends(get_db)):
    turnos = db.query(Turno).options(joinedload(Turno.estado)).all()
    return turnos

@turnos_router.get("", response_model=list[TurnoOut])
def obtener_turnos(
    db: Session = Depends(get_db),
    profesional_id: int | None = Query(default=None),
    paciente_id: int | None = Query(default=None),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    solo_activos: bool = Query(default=False),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """
    Devuelve turnos filtrados.
    - Si pasás desde/hasta: devuelve turnos que se solapan con ese rango.
    - Si no pasás rango: devuelve los últimos `limit` turnos.
    """
    q = db.query(Turno).options(joinedload(Turno.estado))


    if profesional_id is not None:
        q = q.filter(Turno.profesional_id == profesional_id)

    if paciente_id is not None:
        q = q.filter(Turno.paciente_id == paciente_id)

    # Filtro por solapamiento con rango [desde, hasta)
    if desde is not None and hasta is not None:
        if hasta <= desde:
            raise HTTPException(status_code=400, detail="hasta debe ser mayor que desde")
        q = q.filter(
            desde < Turno.fecha_hora_fin,
            hasta > Turno.fecha_hora_inicio
        )
    elif desde is not None:
        # desde solo: todo lo que termina después de desde
        q = q.filter(Turno.fecha_hora_fin > desde)
    elif hasta is not None:
        # hasta solo: todo lo que empieza antes de hasta
        q = q.filter(Turno.fecha_hora_inicio < hasta)
    else:
        # Sin rango: por defecto traemos algo razonable
        q = q.order_by(Turno.id.desc())

    if solo_activos: #trae solo los turnos que esten en estado RESERVADO o CONFIRMADO
        estado_reservado = _estado_id_por_codigo(db, "RESERVADO")
        estado_confirmado = _estado_id_por_codigo(db, "CONFIRMADO")
        q = q.filter(Turno.estado_id.in_([estado_reservado, estado_confirmado]))
    

    q = q.order_by(Turno.fecha_hora_inicio.asc())
    return q.limit(limit).all()


@turnos_router.get("/{turno_id}", response_model=TurnoOut)
def obtener_turno_por_id(turno_id: int, db: Session = Depends(get_db)):
    turno = (
        db.query(Turno)
        .options(joinedload(Turno.estado))
        .filter(Turno.id == turno_id)
        .first()
    )
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado.")
    return turno

@turnos_router.post("/{turno_id}/confirmar", response_model=TurnoOut)
def confirmar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_CONFIRMAR)
    db.refresh(turno, attribute_names=["estado"])
    return turno

@turnos_router.post("/{turno_id}/cancelar", response_model=TurnoOut)
def cancelar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_CANCELAR)
    db.refresh(turno, attribute_names=["estado"])
    return turno

@turnos_router.post("/{turno_id}/completar", response_model=TurnoOut)
def completar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_COMPLETAR)
    db.refresh(turno, attribute_names=["estado"])
    return turno

@turnos_router.post("/{turno_id}/no_asistio", response_model=TurnoOut)
def marcar_no_asistio(turno_id: int, db: Session = Depends(get_db)):
    turno = aplicar_evento_turno(db, turno_id, EVENTO_NO_ASISTIO)
    db.refresh(turno, attribute_names=["estado"])
    return turno