from sqlalchemy import (Column, Integer, String, Boolean)
from app.database import Base

class Profesional(Base):
    __tablename__ = "profesionales"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    especialidad = Column(String(100))
    duracion_turno_min = Column(Integer, nullable=False, default=60)
    activo = Column(Boolean, nullable=False, server_default='1')
    