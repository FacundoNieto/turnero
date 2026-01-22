from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class PacienteCreate(BaseModel): #representa los datos que se necesitan para insertar un registro en la tabla pacientes (lo que iría en VALUES de un INSERT INTO pacientes)
    nombre: str
    dni: Optional[str] = None
    cuil: Optional[str] = None
    telefono: str
    canal_contacto: Literal['whatsapp', 'telegram', 'sms']

class PacienteOut(BaseModel): #representa los campos de la tabla pacientes que se pretenden insertar/editar (las columnas en el INSERT/UPDATE)
    id: int
    nombre: str
    dni: Optional[str] = None
    cuil: Optional[str] = None
    telefono: str
    canal_contacto: str
    activo: bool
    fecha_alta: datetime

    model_config = {"from_attributes": True}

class PacienteUpdate(BaseModel):
    nombre: Optional[str] = None
    dni: Optional[str] = None
    cuil: Optional[str] = None
    telefono: Optional[str] = None
    canal_contacto: Optional[Literal['whatsapp', 'telegram', 'sms']] = None
    activo: Optional[bool] = None
