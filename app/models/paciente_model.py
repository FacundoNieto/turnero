from sqlalchemy import (Column, Integer, String, Enum, Boolean, DateTime, func)
from app.database import Base

class Paciente(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True)
    dni = Column(String(20), unique=True, nullable=True)
    cuil = Column(String(20), unique=True, nullable=True)
    nombre = Column(String(100), nullable=False)
    dni = Column(String(20), unique=True, nullable=True)
    cuil = Column(String(20), unique=True, nullable=True)
    telefono = Column(String(20), nullable=False)
    canal_contacto = Column(
            Enum(
                'whatsapp', 'telegram', 'sms', 
                name = 'canal_contacto_enum'
            )
    )
    activo = Column(Boolean, nullable=False, server_default='1')
    fecha_alta = Column(DateTime, nullable=False, server_default=func.current_timestamp())