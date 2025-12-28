from pydantic import BaseModel
from datetime import datetime
from app.schemas.estado_turno_schema import EstadoTurnoOut

class TurnoCreate(BaseModel): #representa los datos que se necesitan para insertar un registro en la tabla turnos (lo que iría en VALUES de un INSERT INTO turnos)
    paciente_id: int
    profesional_id: int
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime

class TurnoOut(BaseModel): #representa los campos de la tabla turnos que se pretenden insertar/editar (las columnas en el INSERT/UPDATE)
    id: int
    paciente_id: int
    profesional_id: int
    estado_id: int
    estado: EstadoTurnoOut #no es un campo de la tabla, es un relationship para devolver el estado completo al frontend
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    creado_en: datetime

    model_config = {
        "from_attributes": True
    }