from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, Text, Enum
from app.database import Base

class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True)

    turno_id = Column(Integer, ForeignKey("turnos.id"), nullable=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)

    canal = Column(Enum("whatsapp", "telegram", "sms", name="canal_notif"), nullable=False)
    tipo = Column(String(30), nullable=False)

    mensaje = Column(Text, nullable=False)
    programada_para = Column(DateTime, nullable=False)

    estado = Column(Enum("PENDIENTE", "ENVIADA", "FALLIDA", "CANCELADA", name="estado_notif"),
                    nullable=False, default="PENDIENTE")
    intentos = Column(Integer, nullable=False, default=0)
    ultimo_error = Column(Text)

    proveedor_msg_id = Column(String(100))

    creado_en = Column(DateTime)
    enviada_en = Column(DateTime)
    cancelada_en = Column(DateTime)

    dedupe_key = Column(String(120), nullable=False, unique=True)
