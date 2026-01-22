from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from app.schemas.estado_turno_schema import EstadoTurnoOut

class TurnoCreate(BaseModel): #representa los datos que se necesitan para insertar un registro en la tabla turnos (lo que iría en VALUES de un INSERT INTO turnos)
    paciente_id: int
    profesional_id: int
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    auto_confirm: bool | None = None #opcional, si se quiere que el turno se confirme automáticamente al crearlo

    @field_validator("fecha_hora_inicio", "fecha_hora_fin")
    @classmethod
    def _to_utc_naive(cls, v: datetime) -> datetime:
        # Si viene con offset (ej: 2026-01-22T10:00:00-03:00),
        # la convertimos a UTC y le quitamos tzinfo para mantener una convención "UTC naive" usada en todo el código.
        if isinstance(v, datetime) and v.tzinfo is not None:
            return v.astimezone(timezone.utc).replace(tzinfo=None)
        return v

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