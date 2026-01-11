from app.database import Base
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, CheckConstraint, Boolean, Index, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class BloqueoAgenda(Base):
    __tablename__ = "bloqueos_agenda"

    id = Column(Integer, primary_key=True)
    profesional_id = Column(Integer, ForeignKey("profesionales.id"), nullable=False)
    fecha_hora_inicio = Column(DateTime, nullable=False)
    fecha_hora_fin = Column(DateTime, nullable=False)
    motivo = Column(String(255), nullable=True)
    creado_en = Column(DateTime, nullable=False, server_default=func.current_time())
    creado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    actualizado_en = Column(DateTime, nullable=True)
    actualizado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    eliminado_en = Column(DateTime, nullable=True)
    eliminado_por_usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    activo = Column(Boolean, nullable=False, server_default=text("1"))

    profesional = relationship("Profesional", lazy="joined")
    creado_por = relationship("Usuario", foreign_keys=[creado_por_usuario_id], lazy="joined")
    actualizado_por = relationship("Usuario", foreign_keys=[actualizado_por_usuario_id], lazy="joined")
    eliminado_por = relationship("Usuario", foreign_keys=[eliminado_por_usuario_id], lazy="joined")

    __table_args__ = (
        CheckConstraint('fecha_hora_inicio < fecha_hora_fin', name='chk_bloqueo_fechas'),
        Index("idx_bloq_prof_activo", "profesional_id", "activo"),
    )
