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
from app.services.turnos_service import (
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
    inicio: datetime = payload.fecha_hora_inicio
    fin: datetime = payload.fecha_hora_fin

    if fin <= inicio:
        raise HTTPException(status_code=400, detail="La fecha y hora de finalización debe ser posterior a la de inicio")    

    
    # Verificar que el paciente y la profesional ingresados ya existan en la base de datos antes de crear el turno
    paciente = db.get(Paciente, payload.paciente_id) #SELECT * FROM pacientes WHERE id = payload.paciente_id
    if not paciente:
        # TODO (próximo paso): permitir crear el paciente automáticamente o que salte un popup en el frontend para que el usuario lo cree (haciendo un POST a la ruta /pacientes)
        raise HTTPException(status_code=404, detail="Paciente no encontrado. Debe existir en la tabla pacientes")
    
    profesional = db.get(Profesional, payload.profesional_id)
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no existe en la base de datos (tabla 'profesionales').")

    #  Verificar que el paciente y la profesional tengan el atributo 'activo' en True (si no no pueden tener turnos asignados)
    if not paciente.activo:
        raise HTTPException(status_code=400, detail="Paciente inactivo.")
    if not profesional.activo:
        raise HTTPException(status_code=400, detail="Profesional inactivo.")
    
    
    conflicto_paciente = validar_solapamiento_paciente(db, payload.paciente_id, inicio, fin)
    if conflicto_paciente:
        raise HTTPException(status_code=400, detail="El paciente ya tiene un turno en ese horario")

    conflicto_profesional = validar_solapamiento_profesional(db, payload.profesional_id, inicio, fin)
    if conflicto_profesional:
        raise HTTPException(status_code=400, detail="El profesional ya tiene un turno en ese horario")
    
    bloqueo = hay_bloqueo_agenda(db, payload.profesional_id, inicio, fin)
    if bloqueo:
        raise HTTPException(status_code=409, detail="Horario bloqueado en agenda para ese profesional.")


    # Ahora sí se puede crear el turno
    turno = Turno(
        paciente_id=payload.paciente_id,
        profesional_id=payload.profesional_id,
        estado_id=_estado_id_por_codigo(db, "RESERVADO"),
        fecha_hora_inicio=inicio,
        fecha_hora_fin=fin,
        creado_en=datetime.utcnow()
    )

    db.add(turno) #INSERT INTO turnos (...) VALUES (...)
    try:
        db.commit()
    except Exception as e:
        # Esto captura, por ejemplo, el UNIQUE de profesional o paciente con misma fecha_hora de inicio
        db.rollback()
        raise HTTPException(status_code=400, detail= "Error al crear el turno\n" + str(e))  
    db.refresh(turno)
    db.refresh(turno, attribute_names=["estado"])
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