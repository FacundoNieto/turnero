from app.database import Base
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, CheckConstraint

class BloqueoAgenda(Base):
    __tablename__ = "bloqueos_agenda"

    id = Column(Integer, primary_key=True)
    profesional_id = Column(Integer, ForeignKey("profesionales.id"), nullable=False)
    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)
    motivo = Column(String(255))

    __table_args__ = (
        CheckConstraint('fecha_hora_inicio < fecha_hora_fin', name='chk_bloqueo_fechas'),
    )
