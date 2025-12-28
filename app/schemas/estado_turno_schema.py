from pydantic import BaseModel

class EstadoTurnoOut(BaseModel):
    id: int
    codigo: str
    descripcion: str

    model_config = {"from_attributes": True}