from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class Permiso(Base):
    __tablename__ = "permisos"

    id = Column(Integer, primary_key=True)
    codigo = Column(String(80), nullable=False, unique=True)
    descripcion = Column(String(255))

    rol_permisos = relationship("RolPermiso", back_populates="permiso", lazy="selectin")
