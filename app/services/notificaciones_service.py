from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from app.models.notificacion_model import Notificacion
from app.models.turno_model import Turno
from app.models.paciente_model import Paciente
from app.models.profesional_model import Profesional

MAX_INTENTOS = 3

def _now_utc() -> datetime:
    return datetime.utcnow()

def _mensaje_solicitud_confirmacion(turno: Turno, paciente: Paciente, profesional: Profesional) -> str:
    return (
        f"Hola {paciente.nombre}. Tenés una reserva para kinesiología con {profesional.nombre} "
        f"el {turno.fecha_hora_inicio}. Por favor, respondé para confirmar o cancelar."
    )

def _mensaje_confirmacion(turno: Turno, paciente: Paciente, profesional: Profesional) -> str:
    return (
        f"Confirmado ✅ {paciente.nombre}: tu turno con {profesional.nombre} "
        f"es el {turno.fecha_hora_inicio}."
    )

def _mensaje_recordatorio(turno: Turno, paciente: Paciente, profesional: Profesional, etiqueta: str) -> str:
    return (
        f"Recordatorio ({etiqueta}) ⏰ {paciente.nombre}: tu turno con {profesional.nombre} "
        f"es el {turno.fecha_hora_inicio}."
    )

def _mensaje_cancelacion(turno: Turno, paciente: Paciente, profesional: Profesional) -> str:
    return (
        f"Cancelado ❌ {paciente.nombre}: tu turno con {profesional.nombre} "
        f"del {turno.fecha_hora_inicio} fue cancelado."
    )

def enqueue_notificacion(
    db: Session,
    *,
    turno_id: int | None,
    paciente_id: int,
    canal: str,
    tipo: str,
    mensaje: str,
    programada_para: datetime,
    dedupe_key: str,
):
    notif = Notificacion(
        turno_id=turno_id,
        paciente_id=paciente_id,
        canal=canal,
        tipo=tipo,
        mensaje=mensaje,
        programada_para=programada_para,
        estado="PENDIENTE",
        intentos=0,
        creado_en=_now_utc(),
        dedupe_key=dedupe_key,
    )
    db.add(notif)

def cancelar_notificaciones_pendientes_de_turno(db: Session, turno_id: int):
    ahora = _now_utc()
    pendientes = db.execute(
        select(Notificacion).where(
            Notificacion.turno_id == turno_id,
            Notificacion.estado == "PENDIENTE",
        )
    ).scalars().all()

    for n in pendientes:
        n.estado = "CANCELADA"
        n.cancelada_en = ahora
        db.add(n)


def programar_notifs_creacion_turno(db: Session, turno: Turno):
    paciente = db.get(Paciente, turno.paciente_id)
    profesional = db.get(Profesional, turno.profesional_id)
    if not paciente or not profesional:
        raise HTTPException(status_code=500, detail="Faltan datos para notificar (paciente/profesional).")

    canal = paciente.canal_contacto  # whatsapp/telegram/sms

    enqueue_notificacion(
        db,
        turno_id=turno.id,
        paciente_id=paciente.id,
        canal=canal,
        tipo="SOLICITUD_CONFIRMACION",
        mensaje=_mensaje_solicitud_confirmacion(turno, paciente, profesional),
        programada_para=_now_utc(),
        dedupe_key=f"turno:{turno.id}:SOLICITUD_CONFIRMACION",
    )

def programar_notifs_confirmacion(db: Session, turno: Turno):
    paciente = db.get(Paciente, turno.paciente_id)
    profesional = db.get(Profesional, turno.profesional_id)
    if not paciente or not profesional:
        raise HTTPException(status_code=500, detail="Faltan datos para notificar (paciente/profesional).")

    canal = paciente.canal_contacto

    # confirmación inmediata
    enqueue_notificacion(
        db,
        turno_id=turno.id,
        paciente_id=paciente.id,
        canal=canal,
        tipo="CONFIRMACION",
        mensaje=_mensaje_confirmacion(turno, paciente, profesional),
        programada_para=_now_utc(),
        dedupe_key=f"turno:{turno.id}:CONFIRMACION",
    )

    # recordatorios 24h y 2h (solo si son futuros)
    t24 = turno.fecha_hora_inicio - timedelta(hours=24)
    if t24 > _now_utc():
        enqueue_notificacion(
            db,
            turno_id=turno.id,
            paciente_id=paciente.id,
            canal=canal,
            tipo="RECORDATORIO_24H",
            mensaje=_mensaje_recordatorio(turno, paciente, profesional, "24h"),
            programada_para=t24,
            dedupe_key=f"turno:{turno.id}:RECORDATORIO_24H",
        )

    t2 = turno.fecha_hora_inicio - timedelta(hours=2)
    if t2 > _now_utc():
        enqueue_notificacion(
            db,
            turno_id=turno.id,
            paciente_id=paciente.id,
            canal=canal,
            tipo="RECORDATORIO_2H",
            mensaje=_mensaje_recordatorio(turno, paciente, profesional, "2h"),
            programada_para=t2,
            dedupe_key=f"turno:{turno.id}:RECORDATORIO_2H",
        )

def programar_notifs_cancelacion(db: Session, turno: Turno):
    paciente = db.get(Paciente, turno.paciente_id)
    profesional = db.get(Profesional, turno.profesional_id)
    if not paciente or not profesional:
        raise HTTPException(status_code=500, detail="Faltan datos para notificar (paciente/profesional).")

    canal = paciente.canal_contacto

    enqueue_notificacion(
        db,
        turno_id=turno.id,
        paciente_id=paciente.id,
        canal=canal,
        tipo="CANCELACION",
        mensaje=_mensaje_cancelacion(turno, paciente, profesional),
        programada_para=_now_utc(),
        dedupe_key=f"turno:{turno.id}:CANCELACION",
    )

def obtener_notificaciones_pendientes(db: Session, ahora: datetime, limit: int = 50):
    return db.execute(
        select(Notificacion).where(
            Notificacion.estado == "PENDIENTE",
            Notificacion.programada_para <= ahora,
            Notificacion.intentos < MAX_INTENTOS,
        ).order_by(Notificacion.programada_para.asc()).limit(limit)
    ).scalars().all()
