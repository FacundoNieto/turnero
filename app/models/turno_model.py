from sqlalchemy import (Column, Integer, UniqueConstraint, DateTime, ForeignKey, Index)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Turno(Base):
    __tablename__ = "turnos"

    id = Column(Integer, primary_key=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    profesional_id = Column(Integer, ForeignKey("profesionales.id"), nullable=False)
    estado_id = Column(Integer, ForeignKey("estados_turno.id"), nullable=False)

    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)

    creado_en = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    confirmado_en = Column(DateTime, nullable=True)
    cancelado_en = Column(DateTime, nullable=True)

    creado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    actualizado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    actualizado_en = Column(DateTime, nullable=True)

    #relationships para devolver estado.codigo, etc al frontend
    estado = relationship("EstadoTurno", lazy="joined")
    paciente = relationship("Paciente", lazy="joined")
    profesional = relationship("Profesional", lazy="joined")

    creado_por = relationship(
        "Usuario",
        foreign_keys=[creado_por_usuario_id],
        lazy="joined"
    )
    actualizado_por = relationship(
        "Usuario",
        foreign_keys=[actualizado_por_usuario_id],
        lazy="joined"
    )

    __table_args__ = (
        UniqueConstraint("profesional_id", "fecha_hora_inicio", name="uq_turno_prof_inicio"),
        UniqueConstraint("paciente_id", "fecha_hora_inicio", name="uq_turno_pac_inicio"),
        Index("idx_turno_creado_por", "creado_por_usuario_id"),
        Index("idx_turno_actualizado_por", "actualizado_por_usuario_id"),
    )