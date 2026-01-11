from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import relationship

from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True)
    username = Column(String(60), nullable=False, unique=True)
    email = Column(String(120), unique=True)
    password_hash = Column(String(255), nullable=False)
    activo = Column(Boolean, nullable=False, server_default="1")

    profesional_id = Column(Integer, ForeignKey("profesionales.id", ondelete="SET NULL"))

    creado_en = Column(DateTime, nullable=False, server_default=func.current_timestamp())
    ultimo_login_en = Column(DateTime)

    profesional = relationship("Profesional", lazy="joined")

    roles = relationship(
        "Rol",
        secondary="usuario_roles",
        back_populates="usuarios",
        lazy="selectin",
    )