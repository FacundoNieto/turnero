from sqlalchemy import Column, Integer, ForeignKey
from app.database import Base


class UsuarioRol(Base):
    __tablename__ = "usuario_roles"

    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    rol_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
