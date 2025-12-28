from sqlalchemy import (Column, Integer, String, Boolean)
from app.database import Base

class EstadoTurno(Base):
    __tablename__ = "estados_turno"

    id = Column(Integer, primary_key=True)
    codigo = Column(String(20), nullable=False, unique=True)
    descripcion = Column(String(100), nullable=False)