#acá va la lógica del proyecto y no en los endpoints que está en app/api/turnos.py
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from datetime import datetime

from app.models.turno_model import Turno
from app.models.estado_turno_model import EstadoTurno
from app.models.bloqueo_agenda_model import BloqueoAgenda

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
    actor: str | None = None # opcional: "paciente" / "profesional" / "sistema"
):
    turno = db.execute(
        select(Turno).where(Turno.id == turno_id).with_for_update() # SELECT ... FOR UPDATE (bloquea)
    ).scalar_one_or_none()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado.")
    
    estado_actual_codigo = _codigo_por_estado_id(db, turno.estado_id)

    clave = (estado_actual_codigo, evento)
    if clave not in TRANSICIONES:
        raise HTTPException(status_code=409, detail = f'Transición prohibida: {estado_actual_codigo} + {evento} no es una transición válida.')
    
    nuevo_estado_codigo = TRANSICIONES[clave] # devuelve el código (string) del nuevo estado, ver diccionario TRANSICIONES
    turno.estado_id = _estado_id_por_codigo(db, nuevo_estado_codigo) # actualiza estado_id del turno

    ahora = datetime.utcnow()
    # También se deben updetear los campos confirmado_en, cancelado_en, etc según corresponda
    if nuevo_estado_codigo == "CONFIRMADO":
        turno.confirmado_en = ahora
    elif nuevo_estado_codigo == "CANCELADO":
        turno.cancelado_en = ahora

    db.add(turno)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error al actualizar el estado del turno.\n" + str(e))
    db.refresh(turno)
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
            inicio < BloqueoAgenda.fecha_hora_fin,
            fin > BloqueoAgenda.fecha_hora_inicio,
        ).first()
    )