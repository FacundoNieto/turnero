from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.notificaciones_service import obtener_notificaciones_pendientes

def _enviar_stub(canal: str, mensaje: str) -> str:
    # Acá mañana lo reemplazamos por Twilio/Meta/lo que sea.
    print(f"[SEND:{canal}] {mensaje}")
    return "stub-id"

def procesar_notificaciones():
    db: Session = SessionLocal()
    try:
        ahora = datetime.utcnow()
        pendientes = obtener_notificaciones_pendientes(db, ahora, limit=50)

        for n in pendientes:
            try:
                n.intentos += 1
                proveedor_id = _enviar_stub(n.canal, n.mensaje)
                n.proveedor_msg_id = proveedor_id
                n.estado = "ENVIADA"
                n.enviada_en = datetime.utcnow()
                n.ultimo_error = None
                db.add(n)
                db.commit()
            except Exception as e:
                # n.estado = "FALLIDA"
                # n.ultimo_error = str(e)
                # db.add(n)
                # db.commit()
                db.rollback()

    finally:
        db.close()
