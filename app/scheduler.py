from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.turno_model import Turno
from app.services.turnos_service import (
    aplicar_evento_turno,
    EVENTO_VENCER,
    EVENTO_NO_ASISTIO,
    _estado_id_por_codigo,
)

TTL_RESERVA_MIN = 2880  # Tiempo en minutos que una reserva puede estar sin confirmar

def _procesar_turnos_sistema():
    db: Session = SessionLocal()
    try:
        ahora = datetime.utcnow()

        estado_reservado = _estado_id_por_codigo(db, "RESERVADO")
        estado_confirmado = _estado_id_por_codigo(db, "CONFIRMADO")

        # 1) Vencer reservas: RESERVADO y creado_en viejo
        limite = ahora - timedelta(minutes=TTL_RESERVA_MIN)

        reservas_vencidas = db.execute(
            select(Turno.id).where(
                Turno.estado_id == estado_reservado,
                Turno.creado_en != None,
                Turno.creado_en < limite
            )
        ).scalars().all()

        for turno_id in reservas_vencidas:
            aplicar_evento_turno(db, turno_id, EVENTO_VENCER, actor="sistema")

        # 2) No asistió automático: CONFIRMADO y ya terminó
        no_asistio = db.execute(
            select(Turno.id).where(
                Turno.estado_id == estado_confirmado,
                Turno.fecha_hora_fin < ahora
            )
        ).scalars().all()

        for turno_id in no_asistio:
            aplicar_evento_turno(db, turno_id, EVENTO_NO_ASISTIO, actor="sistema")

    finally:
        db.close()