from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BloqueoAgendaCreate(BaseModel): #representa los datos que se necesitan para insertar un registro en la tabla bloqueo_agenda (lo que iría en VALUES de un INSERT INTO bloqueo_agenda)
    profesional_id: int
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    motivo: str

class BloqueoAgendaOut(BaseModel): #representa los campos de la tabla bloqueo_agenda que se pretenden insertar/editar (las columnas en el INSERT/UPDATE)
    id: int
    profesional_id: int
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    motivo: Optional[str] = None

    model_config = {
        "from_attributes": True
    }   