from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Rol(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(255))
    es_sistema = Column(Boolean, nullable=False, server_default="0")

    usuarios = relationship(
        "Usuario",
        secondary="usuario_roles",
        back_populates="roles",
        lazy="selectin",
    )

    # Acceso a permisos con scope vía tabla puente RolPermiso
    rol_permisos = relationship("RolPermiso", back_populates="rol", lazy="selectin")
