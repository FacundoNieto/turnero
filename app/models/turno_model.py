from sqlalchemy import (Column, Integer, UniqueConstraint, DateTime, ForeignKey)
from sqlalchemy.orm import relationship
from app.database import Base

class Turno(Base):
    __tablename__ = "turnos"

    id = Column(Integer, primary_key=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    profesional_id = Column(Integer, ForeignKey("profesionales.id"), nullable=False)
    estado_id = Column(Integer, ForeignKey("estados_turno.id"), nullable=False)

    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)

    creado_en = Column(DateTime) 
    confirmado_en = Column(DateTime)
    cancelado_en = Column(DateTime)

    #relationships para devolver estado.codigo, etc al frontend
    estado = relationship("EstadoTurno")
    paciente = relationship("Paciente")
    profesional = relationship("Profesional")

    __table_args__ = (
        UniqueConstraint('profesional_id', 'fecha_hora_inicio'),
        UniqueConstraint('paciente_id', 'fecha_hora_inicio'),
    )