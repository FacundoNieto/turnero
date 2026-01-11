from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ProfesionalCreate(BaseModel): #representa los datos que se necesitan para insertar un registro en la tabla profesionales (lo que iría en VALUES de un INSERT INTO profesionales)
    nombre: str
    especialidad: Optional[str] = None
    duracion_turno_min: int = 60

class ProfesionalOut(BaseModel): #representa los campos de la tabla profesionales que se pretenden insertar/editar (las columnas en el INSERT/UPDATE)
    id: int
    nombre: str
    especialidad: str
    duracion_turno_min: int
    activo: bool

    model_config = {
        "from_attributes": True
    }

class ProfesionalUpdate(BaseModel):
    nombre: Optional[str] = None
    especialidad: Optional[str] = None
    duracion_turno_min: Optional[int] = None
    activo: Optional[bool] = None