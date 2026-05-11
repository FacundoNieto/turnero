#acá va la lógica del proyecto y no en los endpoints que está en app/api/turnos.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from datetime import datetime

from app.models.turno_model import Turno
from app.models.paciente_model import Paciente
from app.models.profesional_model import Profesional
from app.models.estado_turno_model import EstadoTurno
from app.models.bloqueo_agenda_model import BloqueoAgenda

from app.services.notificaciones_service import (
    programar_notifs_confirmacion,
    programar_notifs_cancelacion,
    cancelar_notificaciones_pendientes_de_turno,
    programar_notifs_creacion_turno,
)

# Eventos permitidos
EVENTO_CONFIRMAR = "confirmar_turno"
EVENTO_CANCELAR = "cancelar_turno"
EVENTO_VENCER = "vencer_reserva"
EVENTO_NO_ASISTIO = "marcar_no_asistio"
EVENTO_COMPLETAR = "marcar_completado"

# FSM (TODO lo no listado acá es ilegal)
TRANSICIONES = {
    ("RESERVADO", EVENTO_CONFIRMAR): "CONFIRMADO",
    ("RESERVADO", EVENTO_CANCELAR): "CANCELADO",
    ("RESERVADO", EVENTO_VENCER): "CANCELADO",

    ("CONFIRMADO", EVENTO_CANCELAR): "CANCELADO",
    ("CONFIRMADO", EVENTO_NO_ASISTIO): "NO_ASISTIO",
    ("CONFIRMADO", EVENTO_COMPLETAR): "COMPLETADO",
}

def _estado_id_por_codigo(db: Session, codigo: str) -> int:
    estado = db.execute(select(EstadoTurno).where(EstadoTurno.codigo == codigo)).scalar_one_or_none()
    if not estado:
        raise HTTPException(status_code=500, detail=f"Estado '{codigo}' no existe en estados_turno.")
    return estado.id

def _codigo_por_estado_id(db: Session, estado_id: int) -> str:
    estado = db.get(EstadoTurno, estado_id)
    if not estado:
        raise HTTPException(status_code=500, detail=f"Estado con id '{estado_id}' no existe en estados_turno.")
    return estado.codigo

def aplicar_evento_turno(
    db: Session,
    turno_id: int,
    evento: str,
    actor: str | None = None, # opcional: "paciente" / "profesional" / "sistema"
    *,
    user=None,
    scope: str = "ANY",  # "OWN" o "ANY"
):
    turno = db.execute(
        select(Turno).where(Turno.id == turno_id).with_for_update() # SELECT ... FOR UPDATE (bloquea)
    ).scalar_one_or_none()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado.")
    

    #######################################

    # ---- RBAC: ownership ----
    if scope == "OWN":
        if not user or not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        if turno.profesional_id != user.profesional_id:
            raise HTTPException(status_code=403, detail="No tenés acceso a este turno.")

    #######################################
    
    estado_actual_codigo = _codigo_por_estado_id(db, turno.estado_id)

    clave = (estado_actual_codigo, evento)
    if clave not in TRANSICIONES:
        raise HTTPException(
            status_code=409, 
            detail = f'Transición prohibida: {estado_actual_codigo} + {evento} no es una transición válida.'
        )
    
    nuevo_estado_codigo = TRANSICIONES[clave] # devuelve el código (string) del nuevo estado, ver diccionario TRANSICIONES
    turno.estado_id = _estado_id_por_codigo(db, nuevo_estado_codigo) # actualiza estado_id del turno

    ahora = datetime.utcnow()
    # También se deben updetear los campos confirmado_en, cancelado_en, etc según corresponda
    if nuevo_estado_codigo == "CONFIRMADO":
        turno.confirmado_en = ahora
    elif nuevo_estado_codigo == "CANCELADO":
        turno.cancelado_en = ahora

    ########################################

    # ---- trazabilidad (RBAC)----
    turno.actualizado_en = ahora
    if user:
        turno.actualizado_por_usuario_id = user.id

    ########################################

    # Gestión de notificaciones asociadas al turno
    # Importante: NO envían nada acá, solo encolan en DB.
    if nuevo_estado_codigo == "CONFIRMADO":
        programar_notifs_confirmacion(db, turno)
    elif nuevo_estado_codigo == "CANCELADO":
        cancelar_notificaciones_pendientes_de_turno(db, turno.id)
        programar_notifs_cancelacion(db, turno)
    elif nuevo_estado_codigo in ["NO_ASISTIO", "COMPLETADO"]:
        cancelar_notificaciones_pendientes_de_turno(db, turno.id)

    db.add(turno)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto: notificación duplicada o restricción UNIQUE.\n" + str(e))    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar el estado del turno.\n" + str(e))
    db.refresh(turno)
    db.refresh(turno, attribute_names=["estado"])

    return turno

ESTADO_RESERVADO = 1
ESTADO_CONFIRMADO = 2

def validar_solapamiento_paciente(
    db: Session,
    paciente_id: int,
    inicio: datetime,
    fin: datetime
):
    estados_activos = [_estado_id_por_codigo(db, "RESERVADO"), _estado_id_por_codigo(db, "CONFIRMADO")]
    return (
        db.query(Turno).filter(
            Turno.paciente_id == paciente_id,
            inicio < Turno.fecha_hora_fin,
            fin > Turno.fecha_hora_inicio,
            Turno.estado_id.in_(estados_activos),
        ).first()
    )

def validar_solapamiento_profesional(
    db: Session, 
    profesional_id: int, 
    inicio: datetime, 
    fin: datetime
):
    estados_activos = [_estado_id_por_codigo(db, "RESERVADO"), _estado_id_por_codigo(db, "CONFIRMADO")]
    return (
        db.query(Turno).filter(
            Turno.profesional_id == profesional_id,
            inicio < Turno.fecha_hora_fin,
            fin > Turno.fecha_hora_inicio,
            Turno.estado_id.in_(estados_activos),
        ).first()
    )

def hay_bloqueo_agenda(db: Session, profesional_id: int, inicio: datetime, fin: datetime):
    return (
        db.query(BloqueoAgenda).filter(
            BloqueoAgenda.profesional_id == profesional_id,
            BloqueoAgenda.activo == True,
            inicio < BloqueoAgenda.fecha_hora_fin,
            fin > BloqueoAgenda.fecha_hora_inicio,
        ).first()
    )


def crear_turno(
    db: Session,
    *,
    paciente_id: int,
    profesional_id: int,
    inicio: datetime,
    fin: datetime,
    user=None,
    scope: str = "ANY",
):
    # Validaciones
    if fin <= inicio:
        raise HTTPException(status_code=400, detail="La fecha de inicio debe ser anterior a la fecha de fin.")

    ###########################################

    # RBAC: si es OWN, el profesional_id lo decide el token, no el payload
    if scope == "OWN":
        if not user or not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        profesional_id = user.profesional_id

    ###########################################

    # Verificar que el paciente y la profesional ingresados ya existan en la base de datos antes de crear el turno
    paciente = db.get(Paciente, paciente_id) #SELECT * FROM pacientes WHERE id = payload.paciente_id
    if not paciente:
        # TODO (próximo paso): permitir crear el paciente automáticamente o que salte un popup en el frontend para que el usuario lo cree (haciendo un POST a la ruta /pacientes)
        raise HTTPException(status_code=404, detail="Paciente no encontrado. Debe existir en la tabla pacientes")
    
    profesional = db.get(Profesional, profesional_id)
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no existe en la base de datos (tabla 'profesionales').")

    #  Verificar que el paciente y la profesional tengan el atributo 'activo' en True (si no no pueden tener turnos asignados)
    if not paciente.activo:
        raise HTTPException(status_code=400, detail="Paciente inactivo.")
    if not profesional.activo:
        raise HTTPException(status_code=400, detail="Profesional inactivo.")
    
    bloqueo = hay_bloqueo_agenda(db, profesional_id, inicio, fin)
    if bloqueo:
        raise HTTPException(status_code=409, detail="Horario bloqueado en agenda para ese profesional.")

    conflicto_paciente = validar_solapamiento_paciente(db, paciente_id, inicio, fin)
    if conflicto_paciente:
        raise HTTPException(status_code=409, detail="El paciente ya tiene un turno en ese horario")

    conflicto_profesional = validar_solapamiento_profesional(db, profesional_id, inicio, fin)
    if conflicto_profesional:
        raise HTTPException(status_code=409, detail="El profesional ya tiene un turno en ese horario")

    # Ahora sí se puede crear el turno
    ahora = datetime.utcnow()
    turno = Turno(
        paciente_id=paciente_id,
        profesional_id=profesional_id,
        estado_id=_estado_id_por_codigo(db, "RESERVADO"),
        fecha_hora_inicio=inicio,
        fecha_hora_fin=fin,
        creado_en=ahora,
    )

    ####################################################

    # trazabilidad (RBAC)
    if user:
        turno.creado_por_usuario_id = user.id
        turno.actualizado_por_usuario_id = user.id
        turno.actualizado_en = ahora

    ####################################################

    db.add(turno) #INSERT INTO turnos (...) VALUES (...)
    db.flush()  # para obtener turno.id antes del commit
    programar_notifs_creacion_turno(db, turno)

    try:
        db.commit()
    except  IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de integridad al crear turno.\n" + str(e))
    except Exception as e:
        # Esto captura, por ejemplo, el UNIQUE de profesional o paciente con misma fecha_hora de inicio
        db.rollback()
        raise HTTPException(status_code=400, detail= "Error al crear el turno\n" + str(e))  
    
    db.refresh(turno)
    db.refresh(turno, attribute_names=["estado"])

    return turno


def query_turnos_filtrados(
    db: Session,
    *,
    user=None,
    scope: str = "ANY",
    profesional_id: int | None = None,
    paciente_id: int | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    paciente_nombre: str | None = None,
    profesional_nombre: str | None = None,
    estado: str | None = None,
    solo_activos: bool = False,
):
    q = db.query(Turno).options(joinedload(Turno.estado), joinedload(Turno.paciente), joinedload(Turno.profesional))

    # RBAC OWN: si es OWN, el profesional_id real lo impone el token
    if scope == "OWN":
        if not user or not getattr(user, "profesional_id", None):
            raise HTTPException(status_code=403, detail="Usuario sin profesional asociado.")
        q = q.filter(Turno.profesional_id == user.profesional_id)

    # Filtros “de negocio” (solo se aplican encima de RBAC)
    if profesional_id is not None:
        q = q.filter(Turno.profesional_id == profesional_id)

    if paciente_id is not None:
        q = q.filter(Turno.paciente_id == paciente_id)

    # Filtrar por nombre parcial del paciente (case-insensitive)
    if paciente_nombre:
        # Aseguramos hacer un join con tabla pacientes y filtrar por nombre
        q = q.join(Paciente, Turno.paciente).filter(Paciente.nombre.ilike(f"%{paciente_nombre}%"))

    if desde is not None and hasta is not None:
        if hasta <= desde:
            raise HTTPException(status_code=400, detail="hasta debe ser mayor que desde")
        q = q.filter(desde < Turno.fecha_hora_fin, hasta > Turno.fecha_hora_inicio)
    elif desde is not None:
        q = q.filter(Turno.fecha_hora_fin > desde)
    elif hasta is not None:
        q = q.filter(Turno.fecha_hora_inicio < hasta)

    if solo_activos:
        estado_reservado = _estado_id_por_codigo(db, "RESERVADO")
        estado_confirmado = _estado_id_por_codigo(db, "CONFIRMADO")
        q = q.filter(Turno.estado_id.in_([estado_reservado, estado_confirmado]))

    # Filtrar por nombre parcial del profesional (case-insensitive)
    if profesional_nombre:
        q = q.join(Profesional, Turno.profesional).filter(Profesional.nombre.ilike(f"%{profesional_nombre}%"))

    # Filtrar por estado usando su código (ej: RESERVADO, CONFIRMADO, CANCELADO)
    if estado:
        estado_id = _estado_id_por_codigo(db, estado)
        q = q.filter(Turno.estado_id == estado_id)

    return q