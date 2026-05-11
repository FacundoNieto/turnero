from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
from app.schemas.estado_turno_schema import EstadoTurnoOut
from app.schemas.paciente_schema import PacienteOut
from app.schemas.profesional_schema import ProfesionalOut

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
    paciente: PacienteOut | None
    profesional: ProfesionalOut | None
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    creado_en: datetime

    model_config = {
        "from_attributes": True
    }

    #debido a que la base de datos no tiene timezone, hay que asumir que los datetimes vienen en UTC y serializarlos 
    #con tzinfo para que el frontend los interprete correctamente (y no los convierta a la zona horaria local del usuario)  
    @field_serializer("fecha_hora_inicio", "fecha_hora_fin")
    def serialize_datetime(self, value: datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()